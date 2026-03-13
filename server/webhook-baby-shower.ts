import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { babyShowerPurchases, babyShowerEvents, babyShowerGiftPackages, customers } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

/**
 * Webhook para pagamentos do Chá de Bebê
 * Suporta: Mercado Pago, Stripe, PagSeguro
 * 
 * POST /webhook/baby-shower/payment
 */
router.post("/payment", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-signature"] || req.headers["x-webhook-signature"];
    const provider = req.headers["x-payment-provider"] || "mercado_pago"; // mercado_pago, stripe, pagseguro

    console.log(`[BabyShower Webhook] Recebido de ${provider}`);

    // Verificar payload
    const { data, type, action } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }

    // Extrair referência do pagamento
    const externalReference = data.external_reference || data.id || data.payment_id;
    const status = data.status || data.payment_status;

    // Buscar compra pelo payment_reference
    const [purchase] = await db
      .select()
      .from(babyShowerPurchases)
      .where(eq(babyShowerPurchases.paymentReference, String(externalReference)))
      .limit(1);

    if (!purchase) {
      console.log(`[BabyShower Webhook] Compra não encontrada: ${externalReference}`);
      return res.status(404).json({ error: "Compra não encontrada" });
    }

    // Mapear status do provedor para nosso status
    const statusMap: Record<string, string> = {
      approved: "paid",
      authorized: "paid",
      paid: "paid",
      cancelled: "failed",
      refunded: "refunded",
      rejected: "failed",
      pending: "pending",
      in_process: "pending",
    };

    const mappedStatus = statusMap[status] || status;

    // Se já foi pago, ignorar
    if (purchase.paymentStatus === "paid" && mappedStatus === "paid") {
      return res.status(200).json({ message: "Pagamento já processado" });
    }

    // Atualizar status
    await db
      .update(babyShowerPurchases)
      .set({
        paymentStatus: mappedStatus,
        paymentMethod: data.payment_method_id || data.payment_method || null,
        paidAt: mappedStatus === "paid" ? new Date() : purchase.paidAt,
      })
      .where(eq(babyShowerPurchases.id, purchase.id));

    // Se pagamento confirmado, atualizar evento
    if (mappedStatus === "paid") {
      const [event] = await db
        .select()
        .from(babyShowerEvents)
        .where(eq(babyShowerEvents.id, purchase.eventId))
        .limit(1);

      const [pkg] = await db
        .select()
        .from(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.id, purchase.packageId))
        .limit(1);

      if (event && pkg) {
        await db
          .update(babyShowerGiftPackages)
          .set({
            soldCount: sql`${babyShowerGiftPackages.soldCount} + 1`,
          })
          .where(eq(babyShowerGiftPackages.id, purchase.packageId));

        await db
          .update(babyShowerEvents)
          .set({
            walletBalance: sql`${babyShowerEvents.walletBalance} + ${purchase.amountPaid}`,
            totalGuests: sql`${babyShowerEvents.totalGuests} + 1`,
            totalDiapersCount: sql`${babyShowerEvents.totalDiapersCount} + ${pkg.quantityRepresented || 1}`,
            availableDiapersCount: sql`${babyShowerEvents.availableDiapersCount} + ${pkg.quantityRepresented || 1}`,
          })
          .where(eq(babyShowerEvents.id, purchase.eventId));

        // Notificar via WhatsApp
        const [mother] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, event.motherCustomerId))
          .limit(1);

        let notificationSent = 0;
        if (mother?.phone) {
          // Importar função de notificação
          const { sendBabyShowerNotification } = await import("./baby-shower-notifications");
          const sent = await sendBabyShowerNotification({
            phone: mother.phone,
            guestName: purchase.guestName,
            packageName: pkg.packageName,
            eventName: event.eventName,
            totalBalance: event.walletBalance,
          });

          if (sent) {
            notificationSent = 1;
          } else {
            console.error("[BabyShower Webhook] Falha ao enviar notificação WhatsApp para", mother.phone);
          }
        }

        // Atualizar status de notificação apenas se enviada com sucesso
        if (notificationSent === 1) {
          await db
            .update(babyShowerPurchases)
            .set({
              notificationSent: 1,
              notificationSentAt: new Date(),
            })
            .where(eq(babyShowerPurchases.id, purchase.id));
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[BabyShower Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Consultar status de pagamento
 * GET /webhook/baby-shower/payment-status/:reference
 */
router.get("/payment-status/:reference", async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }

    const [purchase] = await db
      .select({
        id: babyShowerPurchases.id,
        paymentStatus: babyShowerPurchases.paymentStatus,
        amountPaid: babyShowerPurchases.amountPaid,
        paidAt: babyShowerPurchases.paidAt,
        paymentMethod: babyShowerPurchases.paymentMethod,
        guestName: babyShowerPurchases.guestName,
      })
      .from(babyShowerPurchases)
      .where(eq(babyShowerPurchases.paymentReference, reference))
      .limit(1);

    if (!purchase) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    res.json(purchase);
  } catch (error) {
    console.error("[BabyShower Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
