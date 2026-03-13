import { Router } from "express";
import { getDb } from "../db.js";
import {
  babyShowerPurchases,
  babyShowerEvents,
  babyShowerGiftPackages,
  customers,
} from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { sendWhatsAppNotification } from "../services/whatsapp.js";
import crypto from "node:crypto";

export const babyShowerPublicRouter = Router();

/**
 * GET /api/confirm-payment/:token
 * Confirma o pagamento de uma compra via token único
 * Pode ser acessado por qualquer pessoa (não requer autenticação)
 */
babyShowerPublicRouter.get("/confirm-payment/:token", async (req, res) => {
  const { token } = req.params;
  const db = await getDb();
  if (!db) return res.status(500).json({ error: "Database unavailable" });

  // Buscar compra pelo token
  const [purchase] = await db.select()
    .from(babyShowerPurchases)
    .where(eq(babyShowerPurchases.confirmationToken, token))
    .limit(1);

  if (!purchase) {
    return res.status(404).json({ error: "Token inválido ou expirado" });
  }

  if (purchase.paymentStatus === "paid") {
    // Se já foi pago, retorna sucesso mesmo assim
    if (req.headers.accept?.includes("text/html")) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Confirmação de Pagamento</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
            .card { background: white; padding: 30px; border-radius: 10px; display: inline-block; }
            h1 { color: #2196F3; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Pagamento já Confirmado</h1>
            <p>Esta compra já foi confirmada anteriormente.</p>
            <p><a href="/">Voltar ao início</a></p>
          </div>
        </body>
        </html>
      `);
    }
    return res.json({ success: true, message: "Pagamento já confirmado anteriormente" });
  }

  // Buscar dados relacionados para envio de notificação
  const [event] = await db.select().from(babyShowerEvents).where(eq(babyShowerEvents.id, purchase.eventId)).limit(1);
  const [pkg] = await db.select().from(babyShowerGiftPackages).where(eq(babyShowerGiftPackages.id, purchase.packageId)).limit(1);
  const [mother] = await db.select().from(customers).where(eq(customers.id, event.motherCustomerId)).limit(1);

  // Atualizar status da compra para pago (mas ainda não marca notificação como enviada)
  await db.update(babyShowerPurchases)
    .set({
      paymentStatus: "paid",
      paidAt: new Date(),
    })
    .where(eq(babyShowerPurchases.id, purchase.id));

  // Enviar notificação WhatsApp aos pais
  let notificationSent = 0;
  if (mother?.phone) {
    const babyNameText = event.babyName ? `, ${event.babyName}` : "";
    const message = `🎉 *Novo Presente para seu Chá de Bebê!*\n\n${purchase.guestName} presentou seu bebê${babyNameText} com:\n📦 ${pkg?.packageName || "Um presente especial"}\n\nSua Carteira Virtual foi atualizada.\nTotal arrecadado: R$ ${event.walletBalance}\n\n_Obrigado por escolher a Farma Francis!_`;
    
    try {
      const sent1 = await sendWhatsAppNotification({
        phone: mother.phone,
        message,
      });

      // Mensagem pessoal do convidado
      if (purchase.messageToParents) {
        const personalMessage = `💌 *Mensagem do Convidado*\n\nDe: ${purchase.guestName}\n\n"${purchase.messageToParents}"\n\n---\nPresente: ${pkg?.packageName || "Presente especial"}\n\nCom carinho, Chá de Bebê Farma Francis.`;
        await sendWhatsAppNotification({
          phone: mother.phone,
          message: personalMessage,
        });
      }

      // Só marca como enviada se a primeira notificação (obrigatória) foi bem-sucedida
      if (sent1) {
        notificationSent = 1;
      } else {
        console.error("[Public Confirm] Falha ao enviar notificação WhatsApp para", mother.phone);
      }
    } catch (err) {
      console.error("[Public Confirm] Erro ao enviar WhatsApp:", err);
    }
  }

  // Atualizar flags de notificação apenas se enviada com sucesso
  if (notificationSent === 1) {
    await db.update(babyShowerPurchases)
      .set({
        notificationSent: 1,
        notificationSentAt: new Date(),
      })
      .where(eq(babyShowerPurchases.id, purchase.id));
  }

  // Retornar HTML ou JSON
  if (req.headers.accept?.includes("text/html")) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Confirmação de Pagamento</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
          .card { background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #4CAF50; }
          a { color: #7B68EE; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Pagamento Confirmado!</h1>
          <p>Seu presente foi registrado com sucesso.</p>
          <p>Os pais já foram notificados.</p>
          <p><a href="/">Voltar ao início</a></p>
        </div>
      </body>
      </html>
    `);
  }

  return res.json({ success: true, message: "Pagamento confirmado com sucesso! Os pais foram notificados." });
});
