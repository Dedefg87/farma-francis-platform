import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { customers, queues, conversations } from '../drizzle/schema';

// ==============================================
// Ingest inbound conversation message (WhatsApp/Instagram)
// ==============================================
export async function ingestInboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  fromNumber: string;
  fromName?: string | null;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
}) {
  console.log("[Ingest] Starting for message from", message.fromNumber, "type:", message.messageType);
  
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] Database not available!");
    return null;
  }

  // 1. Find or create customer
  const customer = await findOrCreateCustomerByPhone(
    message.fromNumber,
    message.fromName || undefined
  );

  // 2. Fetch profile picture in background (non-blocking)
  if (message.provider === "whatsapp" && !customer?.photoUrl) {
    setImmediate(async () => {
      try {
        const profile = await fetchEvolutionProfile(message.fromNumber);
        if (profile?.profilePicture) {
          const db = await getDb();
          if (db && customer?.id) {
            await db
              .update(customers)
              .set({ photoUrl: profile.profilePicture, updatedAt: new Date() })
              .where(eq(customers.id, customer.id));
          }
        }
      } catch (err) {
        // Silently fail - photo is not critical
      }
    });
  }

  const now = message.createdAt ?? new Date();

  // 3. Pick least loaded online agent
  let picked = await pickLeastLoadedOnlineAgent({ provider: message.provider });
  const assignedUserId = picked && Number.isFinite(picked.userId) && picked.userId > 0
    ? picked.userId
    : null;

  console.log("[ingestInbound] 🎯 Agent pick result:", { picked: picked?.userId, assignedUserId, customerPhone: customer.phone });

  // 4. Get default queue
  const [defaultQueue] = await db
    .select()
    .from(queues)
    .where(eq(queues.status, "active"))
    .orderBy(desc(queues.priority))
    .limit(1);

  // 5. Find existing conversation (open or assigned)
  const [existingConversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.customerId, customer.id),
        eq(conversations.channel, message.provider),
        or(
          eq(conversations.status, "open"),
          eq(conversations.status, "assigned")
        )
      )
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);

  let conversationId = existingConversation?.id;

  // 6. Create or update conversation
  if (!conversationId) {
    // Create new conversation
    await db.insert(conversations).values({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: message.provider || "whatsapp", // fallback para whatsapp se undefined
      status: assignedUserId ? "assigned" : "open",
      assignedTo: assignedUserId,
      queueId: assignedUserId ? null : (defaultQueue?.id ?? null),
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 1,
    });

    const [newConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerId, customer.id))
      .orderBy(desc(conversations.id))
      .limit(1);

    conversationId = newConversation?.id;
  } else {
    // Update existing conversation
    const shouldAssign = !existingConversation?.assignedTo && assignedUserId;
    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        unreadCount: sql<number>`unread_count + 1`,
        ...(shouldAssign
          ? {
              assignedTo: assignedUserId,
              status: "assigned",
              queueId: null,
            }
          : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  // 7. ECONOMIA DE ESPAÇO: salvar apenas URL original (não baixar como base64)
  // O endpoint /api/media/:id fará fetch da Evolution API quando necessário
  const fileUrlToSave = message.mediaUrl || null;

  // 8. Insert conversation message
  const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: message.externalId || null,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: fileUrlToSave,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    createdAt: now,
  });

  const messageDbId = insertResult.insertId as number;

  // 9. If it's a WhatsApp media message with a temporary URL, trigger Evolution download to upload to R2
  if (
    message.provider === "whatsapp" &&
    message.externalId &&
    fileUrlToSave &&
    fileUrlToSave.includes("mmg.whatsapp.net")
  ) {
    try {
      console.log("[S3] Triggering Evolution download for R2 upload, messageId:", message.externalId);
      
      const [configRecord] = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, "evolution_api"))
        .limit(1);
      
      if (configRecord?.settings) {
        const settings = JSON.parse(configRecord.settings as string);
        const instance = settings.instances?.find((i: unknown) => i.name === "Meu") || settings.instances?.[0];

        if (instance?.url && instance?.apiKey) {
          const downloadUrl = `${instance.url}/message/download/${message.externalId}`;
          console.log("[S3] Calling Evolution download endpoint:", downloadUrl);
          
          const response = await fetch(downloadUrl, {
            headers: {
              "apikey": instance.apiKey,
            },
            signal: AbortSignal.timeout(15000),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("[S3] Download response:", data);
            
            const r2Url = data?.url || data?.mediaUrl || null;
            if (r2Url && r2Url.includes("r2.dev")) {
              console.log("[S3] ✅ Got R2 URL, updating message:", r2Url);
              
              await db
                .update(conversationMessages)
                .set({ fileUrl: r2Url })
                .where(eq(conversationMessages.id, messageDbId));
              
              console.log("[S3] Message updated with R2 URL");
            }
          } else {
            console.log("[S3] ❌ Download failed:", response.status, response.statusText);
          }
        }
      }
    } catch (error) {
      console.log("[S3] Error during R2 upload:", error);
      // Non-critical - message still saved with original URL
    }
  }

  console.log("[Ingest] ✅ Message ingested successfully:", { conversationId, messageDbId });
  return { conversationId, customerId: customer.id };
}
