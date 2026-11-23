// [BUILD VERSION] routers-messages v2.0 - regex fix + send debug
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { conversationMessages, conversations, users, employees, internalMessages } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sseManager, EVENTS } from "./_core/sse";
import { sendWhatsAppAudio, sendWhatsAppMessage, sendInstagramMessage } from "./messaging";

export const messagesRouter = router({
  /**
   * Deleta uma mensagem por ID.
   */
  delete: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .delete(conversationMessages)
        .where(eq(conversationMessages.id, input.messageId));

      // MySQL delete returns affected rows
      const affected = (result as any)?.[0]?.affectedRows ?? 0;
      if (affected === 0) {
        throw new Error("Mensagem não encontrada");
      }

      return { success: true };
    }),

  /**
   * Encaminha uma mensagem (texto, imagem, documento, etc.) para outro atendente OU para um cliente.
   * - Se targetAgentId: atendente recebe como sussurro (mensagem interna)
   * - Se targetCustomerPhone: cliente recebe via WhatsApp/Instagram
   */
  forward: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        targetAgentId: z.number().optional(), // ID do atendente destino
        targetCustomerPhone: z.string().optional(), // Telefone do cliente destino
        targetProvider: z.enum(["whatsapp", "instagram"]).optional(), // Canal para envio ao cliente
      })
    )
    .mutation(async ({ input, ctx }): Promise<{ success: boolean; internalMessageId?: number; externalMessageId?: string }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar: deve ter pelo menos um destino
      if (!input.targetAgentId && !input.targetCustomerPhone) {
        throw new Error("Informe targetAgentId ou targetCustomerPhone");
      }

      // Buscar a mensagem original
      const [originalMsg] = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.id, input.messageId))
        .limit(1);

      if (!originalMsg) {
        throw new Error("Mensagem original não encontrada");
      }

      // LOG OBRIGATÓRIO - originalMsg
      console.log("[FORWARD] originalMsg:", originalMsg);
      console.log("[FORWARD] originalMsg.fileUrl:", originalMsg.fileUrl);
      console.log("[FORWARD] originalMsg.fileType:", originalMsg.fileType);
      console.log("[FORWARD] originalMsg.externalId:", originalMsg.externalId);
      console.log("[FORWARD] originalMsg.content:", originalMsg.content);

      // Buscar a conversa para contexto
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, originalMsg.conversationId))
        .limit(1);

      if (!conv) {
        throw new Error("Conversa não encontrada");
      }

      // Buscar nome do atendente remetente
      const [senderUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const senderName = senderUser?.displayName || senderUser?.name || "Atendente";

      // Criar conteúdo da mensagem encaminhada
      let forwardContent = `📤 **Mensagem encaminhada por ${senderName}**\n\n`;
      
      if (originalMsg.content && originalMsg.content !== "null") {
        forwardContent += `💬 ${originalMsg.content}\n\n`;
      }

      if (originalMsg.fileUrl) {
        const fileType = originalMsg.fileType || "";
                    if (fileType.startsWith("image/")) {
          forwardContent += `🖼️ [Imagem encaminhada](${originalMsg.fileUrl})\n`;
        } else if (fileType.startsWith("audio/")) {
          forwardContent += `🎵 [Áudio encaminhado](${originalMsg.fileUrl})\n`;
        } else if (fileType.startsWith("video/")) {
          forwardContent += `🎬 [Vídeo encaminhado](${originalMsg.fileUrl})\n`;
        } else {
          forwardContent += `📎 [Documento encaminhado](${originalMsg.fileUrl})\n`;
        }
        if (originalMsg.fileName) {
          forwardContent += `📄 ${originalMsg.fileName}\n`;
        }
      }

      forwardContent += `\n🔗 Conversa: #${conv.id} - ${conv.customerName || conv.customerPhone}`;

      // OPÇÃO 1: Encaminhar para outro ATENDENTE (mensagem interna/sussurro)
      if (input.targetAgentId) {
        // Salvar como mensagem interna (sussurro) para o atendente destino
        const insertResult = await db.insert(internalMessages).values({
          conversationId: originalMsg.conversationId,
          senderId: ctx.user.id,
          recipientId: input.targetAgentId,
          content: forwardContent,
          createdAt: new Date(),
        });

        const rawId = Array.isArray(insertResult)
          ? insertResult[0]?.insertId
          : insertResult?.insertId || insertResult?.lastInsertRowid;
        const internalMessageId = Number(rawId) || null;

        // Notificar via SSE o atendente destino
        if (internalMessageId) {
          sseManager.emitToUser(String(input.targetAgentId), EVENTS.INTERNAL_MESSAGE, {
            messageId: internalMessageId,
            conversationId: originalMsg.conversationId,
            senderId: ctx.user.id,
            senderName,
            content: forwardContent,
            createdAt: new Date().toISOString(),
          });
        }

        return { success: true, internalMessageId };
      }

      // OPÇÃO 2: Encaminhar para um CLIENTE (via WhatsApp/Instagram)
      if (input.targetCustomerPhone) {
        const provider = input.targetProvider || conv.channel || "whatsapp";

        // Reabrir conversa se estiver fechada + criar se nao existir
        let existingConv: any = null;
        try {
          const { conversations, customers } = await import("../drizzle/schema");
          const { eq: eqFn } = await import("drizzle-orm");
          [existingConv] = await db
            .select()
            .from(conversations)
            .where(eqFn(conversations.customerPhone, input.targetCustomerPhone))
            .limit(1);
          if (existingConv && existingConv.status === "closed") {
            await db
              .update(conversations)
              .set({ status: "open", updatedAt: new Date() })
              .where(eqFn(conversations.id, existingConv.id));
            console.log("[FORWARD] Conversa #" + existingConv.id + " reaberta");
          }
          if (!existingConv) {
            let [customer] = await db.select().from(customers).where(eqFn(customers.phone, input.targetCustomerPhone)).limit(1);
            if (!customer) {
              const [newCustomer] = await db.insert(customers).values({
                phone: input.targetCustomerPhone,
                name: input.targetCustomerPhone,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
              }).returning();
              customer = newCustomer;
            }
            const [newConv] = await db.insert(conversations).values({
              customerId: customer.id,
              customerPhone: input.targetCustomerPhone,
              customerName: customer.name || input.targetCustomerPhone,
              channel: provider,
              status: "open",
              assignedTo: ctx.user.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            console.log("[FORWARD] Nova conversa criada #" + newConv.id + " para " + input.targetCustomerPhone);
          }
        } catch (e) {
          console.log("[FORWARD] Erro ao reabrir/criar conversa:", String(e.message || e).substring(0, 100));
        }

        let externalMessageId: string | null = null;

        // Preparar conteúdo para envio ao cliente (sem metadados internos)
        let customerContent = `📤 Mensagem encaminhada:\n\n`;
        
        if (originalMsg.content && originalMsg.content !== "null") {
          customerContent += `${originalMsg.content}\n\n`;
        }

        if (originalMsg.fileUrl) {
          const fileType = originalMsg.fileType || "";
          if (fileType.startsWith("image/")) {
            customerContent += `[Imagem]\n`;
          } else if (fileType.startsWith("audio/")) {
            customerContent += `[Áudio]\n`;
          } else if (fileType.startsWith("video/")) {
            customerContent += `[Vídeo]\n`;
          } else {
            customerContent += `[Documento]\n`;
          }
          if (originalMsg.fileName) {
            customerContent += `${originalMsg.fileName}\n`;
          }
          customerContent += `${originalMsg.fileUrl}\n`;
        }

        if (provider === "whatsapp") {
          const { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppViewOnceMedia } = await import("./messaging");
          const { uploadToR2, isR2Url } = await import("./r2-client.js");
          
          // Helper para obter URL pública da mídia
const ensurePublicMediaUrl = async (mediaUrl: string, mimetype: string): Promise<string | null> => {
  // Se ja for URL do R2, usar como esta
  if (isR2Url(mediaUrl)) return mediaUrl;

  // FIX: chave legada/pura (sem http) - resolver via R2 publico (tenta com e sem prefixo media/)
  if (mediaUrl && mediaUrl.indexOf("http") !== 0 && !mediaUrl.startsWith("data:")) {
    const publicBase = process.env.VITE_PUBLIC_R2_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev";
    const base = publicBase.endsWith("/") ? publicBase.slice(0, -1) : publicBase;
    const candidates = mediaUrl.startsWith("media/") ? [mediaUrl] : [mediaUrl, "media/" + mediaUrl];
    for (const cand of candidates) {
      try {
        const candUrl = base + "/" + cand;
        const headResp = await fetch(candUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        if (headResp.ok) {
          console.log("[FORWARD] Resolved legacy R2 key:", cand);
          return candUrl;
        }
      } catch (e) {
        console.log("[FORWARD] legacy R2 HEAD failed:", cand);
      }
    }
  }


  // Se for data URL (base64), fazer upload para R2
  if (mediaUrl.startsWith("data:")) {
    try {
      const mimeMatch = mediaUrl.match(/^data:([^;]+);base64,(.*)$/s);
      if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
        const buffer = Buffer.from(mimeMatch[2], "base64");
        const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : "jpg";
        const r2Result = await uploadToR2(buffer, `messages/forward_${Date.now()}.${ext}`, mimetype);
        return r2Result.url;
      }
    } catch (r2Err) {
      console.error("[messages.forward] R2 upload failed for data URL:", r2Err);
      const base64Match = mediaUrl.match(/^data:[^;]+;base64,(.*)$/s);
      if (base64Match) return base64Match[1];
    }
  }

  // Para URLs nao-R2, tentar download via Evolution API
  const { getDb: getDb2 } = await import("./db");
  const { integrationSettings } = await import("../drizzle/schema");
  const { eq: eq2 } = await import("drizzle-orm");
  const db2 = await getDb2();

  if (db2) {
    const [config] = await db2
      .select()
      .from(integrationSettings)
      .where(eq2(integrationSettings.integrationType, "evolution_api"))
      .limit(1);
    if (config) {
      const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
      const possibleUrls: string[] = [];
      if (configData.apiUrl) possibleUrls.push(configData.apiUrl.replace(/\/$/, ""));
      const instances = configData.instances || [];
      for (const inst of instances) {
        if (inst?.url) possibleUrls.push(inst.url.replace(/\/$/, ""));
        if (inst?.instanceUrl) possibleUrls.push(inst.instanceUrl.replace(/\/$/, ""));
      }
      const settings = (config as any).settings ? (typeof (config as any).settings === "string" ? JSON.parse((config as any).settings) : (config as any).settings) : null;
      if (settings?.instances) {
        for (const inst of settings.instances) {
          if (inst?.url) possibleUrls.push(inst.url.replace(/\/$/, ""));
          if (inst?.instanceUrl) possibleUrls.push(inst.instanceUrl.replace(/\/$/, ""));
        }
      }
      const uniqueUrls = [...new Set(possibleUrls)];
      const apiKey = configData.apiKey || configData.accessToken || "";

      // Tentativa 1: endpoint /message/download (requer externalId)
      if (originalMsg.externalId) {
        for (const baseUrl of uniqueUrls) {
          const downloadUrl = `${baseUrl}/message/download/${originalMsg.key?.id ?? originalMsg.externalId}`;
          console.log("[FORWARD] downloadUrl:", downloadUrl);
          try {
            const resp = await fetch(downloadUrl, { headers: { apikey: apiKey }, signal: AbortSignal.timeout(15000) });
            console.log("[FORWARD] downloadResponse status:", resp.status);
            if (resp.ok) {
              const ctype = resp.headers.get("content-type") || "";
              let buf: Buffer | null = null;
              if (ctype.includes("json")) {
                const data = await resp.json();
                console.log("[FORWARD] downloadResponse body:", data);
                const actualMediaUrl = data?.url || data?.mediaUrl;
                if (actualMediaUrl) {
                  const mediaResp = await fetch(actualMediaUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
                  if (mediaResp.ok) {
                    const b = Buffer.from(await mediaResp.arrayBuffer());
                    if (b.length > 0) buf = b;
                  }
                }
              } else {
                const b = Buffer.from(await resp.arrayBuffer());
                if (b.length > 0) buf = b;
              }
              if (buf) {
                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                const r2Result = await uploadToR2(buf, `messages/forward_${Date.now()}.${ext}`, mimetype);
                console.log("[FORWARD] uploadToR2 result:", r2Result);
                return r2Result.url;
              }
            }
          } catch (e) {
            console.error("[messages.forward] Download error:", e);
          }
        }
      }

      // Tentativa 2: fetch direto do caminho interno na Evolution
      const decodedUrl = mediaUrl.includes("%40") ? decodeURIComponent(mediaUrl) : mediaUrl;
      for (const baseUrl of uniqueUrls) {
        try {
          const directUrl = baseUrl + "/" + decodedUrl;
          console.log("[FORWARD] Trying direct fetch from Evolution API:", directUrl.substring(0, 100));
          const mediaResp = await fetch(directUrl, { headers: { apikey: apiKey, "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
          console.log("[FORWARD] Direct fetch response:", mediaResp.status);
          if (mediaResp.ok) {
            const ctype = mediaResp.headers.get("content-type") || "";
            if (!ctype.includes("text/html") && !ctype.includes("text/plain")) {
              const buf = Buffer.from(await mediaResp.arrayBuffer());
              if (buf.length > 0) {
                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                const r2Result = await uploadToR2(buf, "messages/forward_" + Date.now() + "." + ext, mimetype);
                console.log("[FORWARD] Uploaded to R2 from Evolution API:", r2Result.url);
                return r2Result.url;
              }
            }
          }
        } catch (e) {
          console.log("[FORWARD] Direct fetch failed:", String((e as any).message || e).substring(0, 100));
        }
      }

      // Tentativa 3: URL HTTP completa, download direto
      if (/^https?:\/\//i.test(mediaUrl)) {
        try {
          const resp = await fetch(mediaUrl, { headers: apiKey ? { apikey: apiKey, "User-Agent": "Mozilla/5.0" } : { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
          if (resp.ok) {
            const ctype = resp.headers.get("content-type") || "";
            if (!ctype.includes("json") && !ctype.includes("text/html") && !ctype.includes("text/plain")) {
              const buf = Buffer.from(await resp.arrayBuffer());
              if (buf.length > 0) {
                const detectedMime = ctype || mimetype;
                const ext = detectedMime.includes("png") ? "png" : detectedMime.includes("webp") ? "webp" : detectedMime.includes("pdf") ? "pdf" : detectedMime.includes("video") ? "mp4" : detectedMime.includes("audio") ? "ogg" : "jpg";
                const r2Result = await uploadToR2(buf, `messages/forward_${Date.now()}.${ext}`, detectedMime);
                return r2Result.url;
              }
            }
          }
        } catch (e) {
          console.error("[messages.forward] Direct download error:", e);
        }
      }
    }
  }

  // Nenhuma tentativa obteve a midia — retornar null (nao devolver caminho interno)
  console.log("[FORWARD] All media fetch attempts failed - returning null");
  return null;
};
          // Enviar mensagem ao cliente
          if (originalMsg.fileUrl) {
            const fileType = originalMsg.fileType || "";
            const publicMediaUrl = await ensurePublicMediaUrl(originalMsg.fileUrl, fileType);
            
            // LOG OBRIGATÓRIO - publicMediaUrl final
            console.log("[FORWARD] publicMediaUrl returned by ensurePublicMediaUrl:", publicMediaUrl);
            
            // LOG OBRIGATÓRIO - payload que será enviado
            const payloadToSend = {
              to: input.targetCustomerPhone,
              imageUrl: publicMediaUrl,
              caption: undefined, // Removido: enviar apenas a imagem sem texto
            };
            console.log("[FORWARD] payload to sendWhatsAppImage:", JSON.stringify(payloadToSend, null, 2));
            
            if (!publicMediaUrl) {
              console.log("[FORWARD] Midia nao recuperavel — enviando aviso de texto");
              const result = await sendWhatsAppMessage({ to: input.targetCustomerPhone, instanceName: (originalMsg as any)?.instanceName || undefined, message: "[Midia nao disponivel para encaminhamento]" });
              externalMessageId = result?.messageId || null;
            } else if (fileType.startsWith("image/")) {
              const result = await sendWhatsAppImage({
                to: input.targetCustomerPhone,
                instanceName: (originalMsg as any)?.instanceName || undefined,
                imageUrl: publicMediaUrl,
                caption: undefined, // Removido: enviar apenas midia sem texto
              });
              externalMessageId = result?.messageId || null;
            } else if (fileType.startsWith("video/")) {
              const result = await sendWhatsAppViewOnceMedia({
                to: input.targetCustomerPhone,
                instanceName: (originalMsg as any)?.instanceName || undefined,
                mediaUrl: publicMediaUrl,
                mediaType: "video",
                caption: undefined, // Removido: enviar apenas midia sem texto
              });
              externalMessageId = result?.messageId || null;
            } else if (fileType.startsWith("audio/")) {
              const result = await sendWhatsAppAudio({
                to: input.targetCustomerPhone,
                instanceName: (originalMsg as any)?.instanceName || undefined,
                mediaUrl: publicMediaUrl,
                caption: undefined, // Removido: enviar apenas midia sem texto
              });
              externalMessageId = result?.messageId || null;
            } else {
        // FIX: Incluir nome e cargo do agente logado nas respostas ao cliente
                const [senderUser] = await db.select().from(users).where(eq(users.id, ctx.user?.id)).limit(1);
                const [senderEmp] = await db.select().from(employees).where(eq(employees.userId, ctx.user?.id)).limit(1);
                const senderName = senderUser?.displayName || senderUser?.name || ctx.user?.name || null;
                const senderPosition = senderEmp?.position || null;
        const result = await sendWhatsAppMessage({
          to: customerPhone,
          instanceName: (originalMsg as any)?.instanceName || undefined,
          message: content,
          senderId: ctx.user?.id ? Number(ctx.user.id) : undefined,
          senderName: senderName,
          senderPosition: senderPosition,
        });
            }
          } else {
            const result = await sendWhatsAppMessage({
              to: input.targetCustomerPhone,
              instanceName: (originalMsg as any)?.instanceName || undefined,
              message: customerContent,
            });
            externalMessageId = result?.messageId || null;
          }
        } else if (provider === "instagram") {
          const result = await sendInstagramMessage({
            to: input.targetCustomerPhone,
            message: customerContent,
            mediaUrl: originalMsg.fileUrl || undefined,
          });
          externalMessageId = result?.messageId || null;
        } else {
          const result = await sendWhatsAppMessage({
            to: input.targetCustomerPhone,
            instanceName: (originalMsg as any)?.instanceName || undefined,
            message: customerContent,
          });
          externalMessageId = result?.messageId || null;
        }

        return { success: true, externalMessageId };
      }

      throw new Error("Destino inválido");
    }),

  list: protectedProcedure
    .input(z.object({ conversation_id: z.coerce.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Buscar mensagens usando Drizzle ORM simples
        const messages = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, input.conversation_id))
          .orderBy(conversationMessages.createdAt);

        // Mapear mensagens e buscar dados do usuário separadamente
        const result = await Promise.all(messages.map(async (msg) => {
          let senderName = null;
          let senderPosition = null;

          // Buscar nome do usuário
          if (msg.senderId) {
            const [user] = await db.select().from(users).where(eq(users.id, msg.senderId)).limit(1);
            senderName = user?.name || null;

            // Buscar cargo do funcionário
            const [employee] = await db.select().from(employees).where(eq(employees.userId, msg.senderId)).limit(1);
            senderPosition = employee?.position || null;
          }

          let _replyContent = (msg as any).replyToContent || null;
          if (!_replyContent && (msg as any).replyToExternalId) {
            try {
              const [replyOrig] = await db.select({ content: conversationMessages.content }).from(conversationMessages).where(eq(conversationMessages.externalId, (msg as any).replyToExternalId)).limit(1);
              _replyContent = replyOrig?.content || null;
            } catch(e) {}
          }
          return {
            id: msg.id,
            conversationId: msg.conversationId,
            externalId: msg.externalId,
            remoteJid: msg.remoteJid,
            provider: msg.provider,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileType: msg.fileType,
            fileSize: msg.fileSize,
            readAt: msg.readAt,
            createdAt: msg.createdAt,
            senderName,
            senderPosition,
            reaction: (msg as any).reaction || null,
            replyToExternalId: (msg as any).replyToExternalId || null,
            replyToContent: _replyContent,
          };
        }));

        return result;
      } catch (error) {
        console.error("[messages.list] Error fetching messages:", error);
        return []; // Return empty array on error to prevent UI crash
      }
    }),

  send: protectedProcedure
    .input(
      z.object({
        // Frontend sends these parameters
        to: z.string().optional(),
        provider: z.enum(["whatsapp", "instagram"]).optional(),
        message: z.string().optional(),
        customerId: z.number().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        viewOnce: z.boolean().optional(),
        // Also accept snake_case
        conversation_id: z.coerce.number().optional(),
        content: z.string().optional(),
        file_url: z.string().optional(),
        file_name: z.string().optional(),
        file_type: z.string().optional(),
        file_size: z.number().optional(),
        replyToMessageId: z.number().optional(), // ID da mensagem original para citar (responder)
        replyToExternalId: z.string().nullable().optional(), // externalId direto do frontend (bypass DB lookup)
      }).refine(
        data => {
          // Must have either conversation_id or (to + provider)
          return !!(data.conversation_id || (data.to && data.provider));
        },
        {
          message: "Either conversation_id or (to + provider) is required",
        }
      )
    )
    .mutation(async ({ input, ctx }) => {
        console.log("[SEND DEBUG] input completo:", JSON.stringify({ conversation_id: input.conversation_id, content: (input.content||input.message||"").substring(0,80), replyToMessageId: input.replyToMessageId, replyToExternalId: input.replyToExternalId, hasReplyTo: !!input.replyToMessageId, hasExternalId: !!input.replyToExternalId }));
      // Admin NÃO pode enviar mensagens ao cliente — usar sussurros (internalMessages)
      if (ctx.user?.role === "admin") {
        throw new Error(
          "Admin não pode enviar mensagens ao cliente. Use mensagens internas (sussurros) para orientar agentes."
        );
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Normalize camelCase/snake_case from frontend
      let fileUrl = input.fileUrl ?? input.file_url ?? null;
      const replyToMessageId = input.replyToMessageId ?? null;
      const replyToExternalIdDirect = input.replyToExternalId ?? null;
      const fileName = input.fileName ?? input.file_name ?? null;
      let fileType = input.fileType ?? input.file_type ?? null;
      const fileSize = input.fileSize ?? input.file_size ?? null;
      const messageText = input.message ?? input.content ?? "";

      // Get conversation details
      // Support both old format (conversation_id) and new format (to + provider)
      let conversationId = input.conversation_id;
      if (!conversationId) {
        // Find conversation by customer phone and provider
        const [foundConv] = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.customerPhone, input.to),
              eq(conversations.channel, input.provider)
            )
          )
          .limit(1);
        conversationId = foundConv?.id;
      }

      if (!conversationId) {
        throw new Error("Conversa não encontrada");
      }

      // Get the customer phone and provider
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      const customerPhone = conv?.customerPhone || input.to;
      const provider = input.provider || conv?.channel || "whatsapp";

      // Build the message content
      let content = messageText;
      if (!content && fileUrl) {
        content = `[Mídia enviada: ${fileName || fileUrl}]`;
      }

      // Send the message
      if (provider === "whatsapp") {
        const { sendWhatsAppMessage } = await import("./messaging");

        // Buscar nome e cargo do agente logado para identificar no chat
        const [senderUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user?.id))
          .limit(1);
        const [senderEmp] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, ctx.user?.id))
          .limit(1);
        const senderName = senderUser?.displayName || senderUser?.name || ctx.user?.name || null;
        const senderPosition = senderEmp?.position || null;

        // Buscar dados da mensagem original para citar (reply)
        let replyToExternalId: string | undefined = undefined;
        let replyToRemoteJid: string | undefined = undefined;
        let replyToContent: string | undefined = undefined;
        let replyToFromMe: boolean | undefined = undefined;
        console.log("[REPLY FLOW] replyToMessageId:", replyToMessageId, "replyToExternalIdDirect:", replyToExternalIdDirect, "type:", typeof replyToMessageId);
        if (replyToExternalIdDirect) {
          replyToExternalId = replyToExternalIdDirect;
          replyToRemoteJid = customerPhone ? customerPhone.replace(/\D/g, "") + "@s.whatsapp.net" : undefined;
          replyToContent = "";
          // Buscar content da mensagem original no DB usando externalId se replyToMessageId não foi fornecido
          if (replyToMessageId) {
            try {
              const [origMsg] = await db.select().from(conversationMessages).where(eq(conversationMessages.id, replyToMessageId)).limit(1);
              if (origMsg) {
                replyToContent = origMsg.content || "";
                replyToFromMe = origMsg.senderType === "agent";
                console.log("[reply] fetched from DB by id - content:", replyToContent?.substring(0,50), "fromMe:", replyToFromMe);
              }
            } catch(e) { console.log("[reply] DB lookup error:", e.message); }
          } else {
            // Tentar buscar pelo externalId direto
            try {
              const [origMsg] = await db.select().from(conversationMessages).where(eq(conversationMessages.externalId, replyToExternalIdDirect)).limit(1);
              if (origMsg) {
                replyToContent = origMsg.content || "";
                replyToFromMe = origMsg.senderType === "agent";
                console.log("[reply] fetched from DB by externalId - content:", replyToContent?.substring(0,50), "fromMe:", replyToFromMe);
              }
            } catch(e) { console.log("[reply] DB lookup by externalId error:", e.message); }
          }
          // replyToFromMe ja definido pelo DB lookup acima
          console.log("[reply] Using direct externalId from frontend:", replyToExternalId);
        } else if (replyToMessageId) {
                  console.log("[REPLY FLOW] querying conversationMessages for id:", replyToMessageId);
                  const [origMsg] = await db.select().from(conversationMessages).where(eq(conversationMessages.id, replyToMessageId)).limit(1);
                  console.log("[REPLY FLOW] origMsg found:", JSON.stringify({ id: origMsg?.id, externalId: origMsg?.externalId, direction: origMsg?.direction, content: origMsg?.content?.substring(0,50) }));
                  replyToExternalId = origMsg?.externalId || undefined;
          
                  // Melhor fallback para remoteJid - usar o remoteJid da mensagem original se disponível
                  // Se não, tentar construir a partir do telefone do cliente da conversa
                  if (origMsg?.remoteJid) {
                    replyToRemoteJid = origMsg.remoteJid;
                  } else if (conv?.customerPhone) {
                    // Normalizar telefone: remover não-dígitos e adicionar sufixo WhatsApp
                    const normalizedPhone = conv.customerPhone.replace(/\D/g, "");
                    replyToRemoteJid = `${normalizedPhone}@s.whatsapp.net`;
                  }
          
                  replyToContent = origMsg?.content || undefined;
                  replyToFromMe = origMsg?.senderType === "agent" || origMsg?.direction === "outbound";
          
                  console.log("[reply] externalId:", replyToExternalId, "remoteJid:", replyToRemoteJid, "content:", replyToContent?.substring(0,50), "fromMe:", replyToFromMe);
          
                  // Validar se temos o mínimo necessário para quoted funcionar
                  if (!replyToExternalId) {
                    console.warn("[reply] AVISO: externalId ausente na mensagem original - quoted pode falhar");
                  }
                  if (!replyToRemoteJid) {
                    console.warn("[reply] AVISO: remoteJid não pôde ser determinado - quoted pode falhar");
                  }
                  if (!replyToContent) {
                    console.warn("[reply] AVISO: conteúdo da mensagem original ausente - quoted.conversation será vazio");
                  }
                }

        console.log("[REPLY FLOW] Final params para sendWhatsAppMessage:", JSON.stringify({
          replyToExternalId: replyToExternalId,
          replyToRemoteJid: replyToRemoteJid,
          replyToContent: replyToContent?.substring(0,50),
          replyToFromMe: replyToFromMe,
          hasReply: !!replyToExternalId
        }));
        const result = await sendWhatsAppMessage({
                  to: customerPhone,
                  instanceName: (conv as any)?.instanceName || undefined,
                  message: content,
                  senderId: ctx.user?.id ? Number(ctx.user.id) : undefined,
                  senderName,
                  senderPosition,
                  replyToMessageId: replyToExternalId,
                  replyToRemoteJid: replyToRemoteJid,
                  replyToContent: replyToContent,
                  replyToFromMe: replyToFromMe,
                });
        return { success: true, messageId: result?.messageId };
      } else if (provider === "instagram") {
        const { sendInstagramMessage } = await import("./messaging");
        const result = await sendInstagramMessage({
          to: customerPhone,
          message: content,
          mediaUrl: fileUrl || undefined,
        });
        return { success: true, messageId: result?.messageId };
      }

      throw new Error("Provider não suportado");
    }),

  /**
   * Responder a uma mensagem específica (reply/context)
   * - replyToId: externalId (Evolution message ID) da mensagem original
   * - content: texto da resposta
   */
  reply: protectedProcedure
    .input(
      z.object({
        replyToId: z.string(), // externalId da mensagem a responder
        content: z.string().min(1),
        conversation_id: z.coerce.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar conversa para obter número do cliente
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversation_id))
        .limit(1);

      if (!conv) throw new Error("Conversa não encontrada");

      // Buscar nome e cargo do agente
      const [senderUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user?.id))
        .limit(1);
      const [senderEmp] = await db
        .select()
        .from(employees)
        .where(eq(employees.userId, ctx.user?.id))
        .limit(1);

      const senderName = senderUser?.displayName || senderUser?.name || ctx.user?.name || null;
      const senderPosition = senderEmp?.position || null;

      // Enviar reply via Evolution API
      const { sendWhatsAppMessage } = await import("./messaging");
      
      // Buscar mensagem original para obter remoteJid (necessário para quoted)
      const [originalMsg] = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.externalId, input.replyToId))
        .limit(1);

      const result = await sendWhatsAppMessage({
        to: conv.customerPhone,
        instanceName: (conv as any)?.instanceName || undefined,
        message: input.content,
        replyToMessageId: input.replyToId,
        replyToRemoteJid: originalMsg?.remoteJid || undefined, // ✅ Passar remoteJid para quoted
        senderId: ctx.user?.id ? Number(ctx.user.id) : undefined,
        senderName,
        senderPosition,
      });

      // Salvar no histórico
      try {
        const { ingestOutboundConversationMessage } = await import("./db-messages");
        await ingestOutboundConversationMessage({
          provider: "whatsapp",
          toNumber: conv.customerPhone,
          fromUserId: ctx.user?.id ? Number(ctx.user.id) : 1,
          fromUserName: senderName || null,
          fromUserPosition: senderPosition || null,
          messageType: "text",
          messageText: input.content,
          externalId: result?.messageId || `outbound-${Date.now()}`,
          replyToExternalId: input.replyToId, // ✅ Referenciar mensagem respondida
          replyToContent: originalMsg?.content || null, // ✅ Salvar conteúdo da mensagem original
          createdAt: new Date(),
        });
      } catch (saveErr) {
        console.error("[messages.reply] Failed to save outbound:", saveErr);
      }

      return { success: true, messageId: result?.messageId };
    }),
  
  /**
   * React to a message with an emoji
   */
  react: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Resolve a mensagem alvo por externalId (key.id do WhatsApp) OU pelo id interno
      let [targetMsg] = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.externalId, input.messageId))
        .limit(1);
      if (!targetMsg) {
        const numericId = Number(input.messageId);
        if (Number.isFinite(numericId)) {
          [targetMsg] = await db
            .select()
            .from(conversationMessages)
            .where(eq(conversationMessages.id, numericId))
            .limit(1);
        }
      }
      if (!targetMsg) {
        throw new Error('Mensagem não encontrada para reação');
      }
      await db
        .update(conversationMessages)
        .set({ reaction: input.emoji })
        .where(eq(conversationMessages.id, targetMsg.id));

      // Envia a reacao via Evolution API chamando sendReaction (a funcao real do modulo messaging)
      try {
        if (!targetMsg) {
          console.error('[messages.react] Nenhuma mensagem encontrada para:', input.messageId);
        } else {
          // 2) Resolve o telefone do cliente -> remoteJid (o mesmo padrao do sendEvolutionText)
          let to = String(targetMsg.remoteJid || '').includes('@') ? String(targetMsg.remoteJid) : '';
          let remoteJid = targetMsg.remoteJid || '';
          if (!remoteJid) {
            const [conv] = await db
              .select()
              .from(conversations)
              .where(eq(conversations.id, targetMsg.conversationId))
              .limit(1);
            const phone = String(conv?.customerPhone || '');
            const digits = phone.replace(/\D/g, '');
            if (digits) {
              remoteJid = digits + '@s.whatsapp.net';
              to = phone || remoteJid;
            }
          } else {
            to = to || remoteJid;
          }
          if (remoteJid) {
            const { sendReaction } = await import('./messaging');
            await sendReaction({
              to,
              messageId: targetMsg.externalId || input.messageId,
              remoteJid,
              emoji: input.emoji,
              fromMe: targetMsg.senderType === 'agent',
            });
          } else {
            console.error('[messages.react] Nao foi possivel resolver remoteJid para o externalId:', input.messageId);
          }
        }
      } catch (e) {
        console.error('[messages.react] Failed to send Evolution reaction:', e);
      }

      return { success: true };
    }),
});