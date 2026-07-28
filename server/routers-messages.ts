import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { conversationMessages, conversations, users, employees, internalMessages } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sseManager, EVENTS } from "./_core/sse";
import { sendWhatsAppMessage, sendInstagramMessage } from "./messaging";

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

      const senderName = senderUser?.name || "Atendente";

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

        try {
          if (provider === "whatsapp") {
            const { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppViewOnceMedia } = await import("./messaging");
            const { uploadToR2, isR2Url } = await import("./r2-client.js");
            
            // Helper to ensure media URL is accessible via Evolution API (upload to R2 if needed)
            const ensurePublicMediaUrl = async (mediaUrl: string, mimetype: string): Promise<string> => {
              // If already R2 URL, use as-is
              if (isR2Url(mediaUrl)) return mediaUrl;
              
              // If data URL (base64), upload to R2
              if (mediaUrl.startsWith("data:")) {
                try {
                  const mimeMatch = mediaUrl.match(/^data:([^;]+);base64,(.*)$/s);
                  if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
                    const buffer = Buffer.from(mimeMatch[2], "base64");
                    const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : "jpg";
                    const r2Result = await uploadToR2(
                      buffer,
                      `messages/forward_${Date.now()}.${ext}`,
                      mimetype
                    );
                    return r2Result.url;
                  }
                } catch (r2Err) {
                  console.error("[messages.forward] R2 upload failed for data URL:", r2Err);
                  const base64Match = mediaUrl.match(/^data:[^;]+;base64,(.*)$/s);
                  if (base64Match) return base64Match[1];
                }
              }
              
              // For ANY non-R2, non-data URL (WhatsApp CDN, Evolution internal, etc.):
              // Try to download via Evolution API /message/download/{messageId} and upload to R2
              if (originalMsg.externalId) {
                try {
                  console.log("[messages.forward] Non-R2 URL, downloading via Evolution API /message/download...");
                  // Get Evolution API config directly
                  const { getDb } = await import("./db");
                  const { integrationSettings } = await import("../drizzle/schema");
                  const { eq } = await import("drizzle-orm");
                  const db2 = await getDb();
                  if (db2) {
                    const [config] = await db2
                      .select()
                      .from(integrationSettings)
                      .where(eq(integrationSettings.integrationType, "evolution_api"))
                      .limit(1);
                    if (config) {
                      const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
                      const apiUrl = (configData.apiUrl || "").replace(/\/$/, "");
                      const apiKey = configData.apiKey || configData.accessToken || "";
                      const downloadUrl = `${apiUrl}/message/download/${originalMsg.externalId}`;
                      
                      console.log("[messages.forward] Calling Evolution download:", downloadUrl);
                      const downloadResponse = await fetch(downloadUrl, {
                        headers: { apikey: apiKey },
                        signal: AbortSignal.timeout(15000),
                      });
                      
                      if (downloadResponse.ok) {
                        const contentType = downloadResponse.headers.get("content-type") || "";
                        
                        if (contentType.includes("json") || contentType.includes("text")) {
                          // Evolution returned JSON with URL
                          const data = await downloadResponse.json();
                          const urlFromResponse = data?.url || data?.mediaUrl || "";
                          if (urlFromResponse && urlFromResponse.includes("r2.dev")) {
                            console.log("[messages.forward] Got R2 URL from Evolution download:", urlFromResponse);
                            return urlFromResponse;
                          }
                          // Download buffer from returned URL and upload to R2
                          if (urlFromResponse) {
                            const mediaResponse = await fetch(urlFromResponse, {
                              headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,video/*,audio/*,*/*'},
                              signal: AbortSignal.timeout(30000),
                            });
                            if (mediaResponse.ok) {
                              const buf = Buffer.from(await mediaResponse.arrayBuffer());
                              if (buf.length > 0) {
                                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                                const r2Result = await uploadToR2(buf, `messages/forward_${Date.now()}.${ext}`, mimetype);
                                console.log("[messages.forward] ✅ Downloaded and uploaded to R2:", r2Result.url);
                                return r2Result.url;
                              }
                            }
                          }
                        } else {
                          // Evolution returned raw media buffer
                          const buf = Buffer.from(await downloadResponse.arrayBuffer());
                          if (buf.length > 0) {
                            const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                            const r2Result = await uploadToR2(buf, `messages/forward_${Date.now()}.${ext}`, mimetype);
                            console.log("[messages.forward] ✅ Downloaded raw media and uploaded to R2:", r2Result.url);
                            return r2Result.url;
                          }
                        }
                      } else {
                        console.error("[messages.forward] Evolution download failed:", downloadResponse.status);
                      }
                    }
                  }
                } catch (downloadErr) {
                  console.error("[messages.forward] Failed to download via Evolution API:", downloadErr);
                }
              } else {
                console.warn("[messages.forward] No externalId available, cannot download via Evolution API");
              }
              
              // If we reach here, we couldn't convert the URL - throw error
              throw new Error("Cannot forward media: no valid public URL or base64 available. The media must be re-uploaded to R2 first.");
            };

            if (originalMsg.fileUrl) {
              const fileType = originalMsg.fileType || "";
              // Ensure media URL is publicly accessible
              const publicMediaUrl = await ensurePublicMediaUrl(originalMsg.fileUrl, fileType);
              
              if (fileType.startsWith("image/")) {
                const result = await sendWhatsAppImage({
                  to: input.targetCustomerPhone,
                  imageUrl: publicMediaUrl,
                  caption: customerContent,
                });
                externalMessageId = result?.messageId || null;
              } else if (fileType.startsWith("video/")) {
                const result = await sendWhatsAppViewOnceMedia({
                  to: input.targetCustomerPhone,
                  mediaUrl: publicMediaUrl,
                  mediaType: "video",
                  caption: customerContent,
                });
                externalMessageId = result?.messageId || null;
              } else if (fileType.startsWith("audio/")) {
                const result = await sendWhatsAppViewOnceMedia({
                  to: input.targetCustomerPhone,
                  mediaUrl: publicMediaUrl,
                  mediaType: "audio",
                  caption: customerContent,
                });
                externalMessageId = result?.messageId || null;
              } else {
                const { sendWhatsAppMessage } = await import("./messaging");
                const result = await sendWhatsAppMessage({
                  to: input.targetCustomerPhone,
                  message: customerContent,
                });
                externalMessageId = result?.messageId || null;
              }
            } else {
              const { sendWhatsAppMessage } = await import("./messaging");
              const result = await sendWhatsAppMessage({
                to: input.targetCustomerPhone,
                message: customerContent,
              });
              externalMessageId = result?.messageId || null;
            }
          } else if (provider === "instagram") {
            const { sendInstagramMessage } = await import("./messaging");
            const result = await sendInstagramMessage({
              to: input.targetCustomerPhone,
              message: customerContent,
              mediaUrl: originalMsg.fileUrl || undefined,
            });
            externalMessageId = result?.messageId || null;
          }
        } catch (sendError) {
          console.error("[messages.forward] Erro ao enviar para cliente:", sendError);
          throw new Error(`Falha ao encaminhar para cliente: ${sendError instanceof Error ? sendError.message : "Erro desconhecido"}`);
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
        throw new Error("Conversation not found - cannot determine which conversation to add message to");
      }

      // Get agent info for sender name and position - DO THIS BEFORE SENDING
      const userId = (ctx as any)?.user?.id;
      const agentName = (ctx as any)?.user?.name || "Atendente";
      
      // Fetch position from employees table
      let agentPosition = null;
      let senderName = agentName;
      
      if (userId) {
        try {
          const [employee] = await db.select()
            .from(employees)
            .where(eq(employees.userId, userId))
            .limit(1);
          
          if (employee) {
            agentPosition = employee.position;
          }
          
          // Also get user name
          const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (user?.name) {
            senderName = user.name;
          }
        } catch (err) {
          console.error("[messages.send] Error fetching employee:", err);
        }
      }

      // If fileUrl is a data URL (base64), upload to R2 first
      // Evolution API requires a public URL or raw base64 for media
      if (fileUrl && fileUrl.startsWith("data:")) {
        try {
          const { uploadToR2 } = await import("./r2-client.js");
          // Extract base64 data and mime type
          const mimeMatch = fileUrl.match(/^data:([^;]+);base64,(.*)$/s);
          if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
            const mimetype = mimeMatch[1];
            const base64Data = mimeMatch[2];
            const buffer = Buffer.from(base64Data, "base64");
            const ext =
              mimetype.includes("png")
                ? "png"
                : mimetype.includes("webp")
                ? "webp"
                : mimetype.includes("pdf")
                ? "pdf"
                : "jpg";
            const r2Result = await uploadToR2(
              buffer,
              `messages/${conversationId}_${Date.now()}.${ext}`,
              mimetype
            );
            fileUrl = r2Result.url; // Replace data URL with R2 public URL
            fileType = mimetype;
            console.log(
              "[messages.send] 📎 Uploaded media to R2:",
              r2Result.url
            );
          }
        } catch (r2Err: unknown) {
          console.error(
            "[messages.send] ⚠️ R2 upload failed, will try sending base64 directly:",
            r2Err
          );
          // Fallback: extract raw base64 for Evolution API
          const base64Match = fileUrl.match(/^data:[^;]+;base64,(.*)$/s);
          if (base64Match) {
            fileUrl = base64Match[1]; // Send raw base64 without data: prefix
          }
        }
      }

      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conv) throw new Error("Conversation not found");

      // Send via Evolution API if WhatsApp - NOW WITH SENDER INFO
      let externalId: string | null = null;
      if (conv.channel === "whatsapp" && conv.customerPhone) {
        try {
          const { sendWhatsAppMessage } = await import("./messaging");
          const result = await sendWhatsAppMessage({
            to: conv.customerPhone,
            message: messageText,
            mediaUrl: fileUrl || undefined,
            caption: fileName || undefined,
            senderName,
            senderPosition: agentPosition,
          });
          externalId = result?.messageId || null;
          console.log(
            "[messages.send] ✅ Sent via Evolution API, externalId:",
            externalId
          );
        } catch (err: unknown) {
          console.error(
            "[messages.send] ❌ Failed to send via Evolution API:",
            err
          );
          // Continue to save message locally even if send fails
        }
      }

      // Save message in DB
      const insertResult = await db.insert(conversationMessages).values({
        conversationId,
        content: messageText,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        senderId: userId || null,
        senderType: "agent",
        externalId,
      });

      const rawId = Array.isArray(insertResult)
        ? insertResult[0]?.insertId
        : insertResult?.insertId || insertResult?.lastInsertRowid;
      const messageId = Number(rawId) || null;

      // Update conversation lastMessageAt
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));

      // Notify via SSE - INCLUDE senderName and senderPosition
      const assignedTo = conv.assignedTo;
      if (assignedTo) {
        sseManager.emitToUser(String(assignedTo), {
          type: EVENTS.MESSAGE_NEW,
          data: {
            conversationId,
            message: {
              id: messageId,
              content: messageText,
              senderType: "agent",
              senderName,
              senderPosition: agentPosition,
              fileUrl,
              fileType,
              createdAt: new Date().toISOString(),
            },
          },
          timestamp: Date.now(),
        });
      }

      // Return full message with sender info
      return { 
        success: true, 
        messageId, 
        externalId, 
        conversationId,
        message: {
          id: messageId,
          conversationId,
          content: messageText,
          senderType: "agent",
          senderName,
          senderPosition: agentPosition,
          fileUrl,
          fileName,
          fileType,
          fileSize,
          createdAt: new Date().toISOString(),
        }
      };
    }),
});