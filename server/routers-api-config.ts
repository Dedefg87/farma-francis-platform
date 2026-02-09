import { router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { integrationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Router para gerenciar configurações de APIs (WhatsApp, Instagram, etc)
 * Apenas admins podem acessar
 */
export const apiConfigRouter = router({
  /**
   * Buscar configurações de uma integração específica
   */
  get: adminProcedure
    .input(z.object({
      integrationType: z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [config] = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, input.integrationType))
        .limit(1);

      if (!config) return null;

      // Parse config JSON
      const configData = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
      
      return {
        ...config,
        config: configData,
      };
    }),

  /**
   * Salvar ou atualizar configurações de uma integração
   */
  save: adminProcedure
    .input(z.object({
      integrationType: z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"]),
      name: z.string(),
      accessToken: z.string().optional(),
      phoneNumberId: z.string().optional(),
      businessAccountId: z.string().optional(),
      webhookUrl: z.string().optional(),
      webhookSecret: z.string().optional(),
      webhookVerifyToken: z.string().optional(),
      appSecret: z.string().optional(),
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
      instanceName: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Montar objeto de configuração
      const config = {
        accessToken: input.accessToken,
        phoneNumberId: input.phoneNumberId,
        businessAccountId: input.businessAccountId,
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        webhookVerifyToken: input.webhookVerifyToken,
        appSecret: input.appSecret,
        apiUrl: input.apiUrl,
        apiKey: input.apiKey,
        instanceName: input.instanceName,
      };

      // Verificar se já existe configuração
      const [existing] = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, input.integrationType))
        .limit(1);

      if (existing) {
        // Atualizar existente
        await db
          .update(integrationSettings)
          .set({
            name: input.name,
            config: JSON.stringify(config),
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, existing.id));

        return { success: true, id: existing.id, action: "updated" };
      } else {
        // Criar novo
        const [result] = await db.insert(integrationSettings).values({
          integrationType: input.integrationType,
          name: input.name,
          config: JSON.stringify(config),
          isActive: input.isActive,
          createdBy: ctx.user.id,
          testStatus: "pending",
        }).$returningId();

        return { success: true, id: result.id, action: "created" };
      }
    }),

  /**
   * Testar conexão com a API
   */
  test: adminProcedure
    .input(z.object({
      integrationType: z.enum(["whatsapp_business", "instagram_graph", "evolution_api"]),
      accessToken: z.string(),
      phoneNumberId: z.string().optional(),
      businessAccountId: z.string().optional(),
      apiUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (input.integrationType === "whatsapp_business") {
          // Testar WhatsApp Business API
          if (!input.accessToken || !input.phoneNumberId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Access Token e Phone Number ID são obrigatórios",
            });
          }

          const response = await fetch(
            `https://graph.facebook.com/v18.0/${input.phoneNumberId}`,
            {
              headers: {
                Authorization: `Bearer ${input.accessToken}`,
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Erro ao conectar: ${error.error?.message || "Token inválido"}`,
            });
          }

          const data = await response.json();
          return {
            success: true,
            message: "Conexão bem-sucedida!",
            data: {
              phoneNumber: data.display_phone_number,
              verifiedName: data.verified_name,
            },
          };
        } else if (input.integrationType === "instagram_graph") {
          // Testar Instagram Graph API
          if (!input.accessToken || !input.businessAccountId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Access Token e Business Account ID são obrigatórios",
            });
          }

          const response = await fetch(
            `https://graph.facebook.com/v18.0/${input.businessAccountId}?fields=id,name,username&access_token=${input.accessToken}`
          );

          if (!response.ok) {
            const error = await response.json();
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Erro ao conectar: ${error.error?.message || "Token inválido"}`,
            });
          }

          const data = await response.json();
          return {
            success: true,
            message: "Conexão bem-sucedida!",
            data: {
              accountId: data.id,
              name: data.name,
              username: data.username,
            },
          };
        } else if (input.integrationType === "evolution_api") {
          // Testar Evolution API
          if (!input.apiUrl || !input.accessToken) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "API URL e API Key são obrigatórios",
            });
          }

          const response = await fetch(`${input.apiUrl}/instance/fetchInstances`, {
            headers: {
              apikey: input.accessToken,
            },
          });

          if (!response.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Erro ao conectar: API Key inválida ou URL incorreta",
            });
          }

          const data = await response.json();
          return {
            success: true,
            message: "Conexão bem-sucedida!",
            data: {
              instances: Array.isArray(data) ? data.length : 0,
            },
          };
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tipo de integração não suportado",
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao testar conexão: ${(error as Error).message}`,
        });
      }
    }),

/**
    * Deletar configuração
    */
  delete: adminProcedure
    .input(z.object({
      integrationType: z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .delete(integrationSettings)
        .where(eq(integrationSettings.integrationType, input.integrationType));

      return { success: true };
    }),

  /**
   * Gerar QR Code para conectar WhatsApp via Evolution API
   */
  generateQrCode: adminProcedure
    .input(z.object({
      apiUrl: z.string(),
      apiKey: z.string(),
      instanceName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const cleanApiUrl = input.apiUrl.replace(/\/$/, "");

        // First, try to create instance with QR code
        console.log("[QR Code] Creating instance with QR...");
        const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: input.apiKey,
          },
          body: JSON.stringify({
            instanceName: input.instanceName,
            qr: true,
            integration: "WHATSAPP",
          }),
        });

        const createText = await createResponse.text();
        console.log("[QR Code] Create response:", createText.substring(0, 500));

        // Try different endpoints to get QR code
        const endpoints = [
          `${cleanApiUrl}/instance/qrcode/${input.instanceName}`,
          `${cleanApiUrl}/instance/connect/${input.instanceName}`,
          `${cleanApiUrl}/instance/QRCode/${input.instanceName}`,
        ];

        let qrData = null;
        let workedEndpoint = null;

        for (const endpoint of endpoints) {
          console.log("[QR Code] Trying endpoint:", endpoint);
          try {
            const qrResponse = await fetch(endpoint, {
              headers: {
                apikey: input.apiKey,
              },
            });

            if (qrResponse.ok) {
              const data = await qrResponse.text();
              console.log("[QR Code] Response from", endpoint, ":", data.substring(0, 500));
              
              try {
                qrData = JSON.parse(data);
                workedEndpoint = endpoint;
                break;
              } catch {
                // Maybe it's not JSON, could be base64 directly
                if (data.startsWith("data:image") || data.length > 100) {
                  qrData = { base64: data };
                  workedEndpoint = endpoint;
                  break;
                }
              }
            }
          } catch (e) {
            console.log("[QR Code] Endpoint failed:", endpoint, e);
          }
        }

        if (!qrData) {
          // Try to check if instance exists and is connected
          console.log("[QR Code] Checking instance status...");
          const statusResponse = await fetch(`${cleanApiUrl}/instance/fetchInstances`, {
            headers: {
              apikey: input.apiKey,
            },
          });

          if (statusResponse.ok) {
            const instances = await statusResponse.json();
            console.log("[QR Code] Instances:", JSON.stringify(instances).substring(0, 500));
          }
        }

        console.log("[QR Code] Final qrData:", qrData);

        if (!qrData) {
          return {
            success: false,
            message: "Não foi possível gerar o QR Code. A instância pode já estar conectada ou os endpoints podem ter mudado.",
            hint: "Tente desconectar a instância manualmente no Evolution API e tente novamente.",
          };
        }

        // Try to find QR code in response
        let qrCode = qrData.base64 || qrData.qrcode || qrData.data || qrData.qr || qrData.code || qrData.pairingCode;

        if (!qrCode && qrData.instance?.qrcode) {
          qrCode = qrData.instance.qrcode;
        }

        if (!qrCode && qrData.status === "created") {
          // Instance was just created, might need to wait
          return {
            success: true,
            qrCode: null,
            message: "Instância criada! Aguarde uns segundos e tente novamente para gerar o QR Code.",
            justCreated: true,
          };
        }

        if (!qrCode) {
          return {
            success: false,
            message: "QR Code não encontrado na resposta. Verifique o status da instância.",
            debug: workedEndpoint,
          };
        }

        return {
          success: true,
          qrCode: qrCode,
          message: "QR Code gerado com sucesso! Escaneie com o WhatsApp.",
        };
      } catch (error) {
        console.error("[QR Code] Error:", error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao gerar QR Code: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Desconectar instância do WhatsApp (para gerar novo QR Code)
   */
  disconnectInstance: adminProcedure
    .input(z.object({
      apiUrl: z.string(),
      apiKey: z.string(),
      instanceName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const cleanApiUrl = input.apiUrl.replace(/\/$/, "");

        console.log("[QR Code] Disconnecting instance:", input.instanceName);
        
        // Delete the instance to force a new QR code
        const deleteResponse = await fetch(
          `${cleanApiUrl}/instance/delete/${input.instanceName}`,
          {
            method: "DELETE",
            headers: {
              apikey: input.apiKey,
            },
          }
        );

        if (!deleteResponse.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Erro ao desconectar instância. Verifique se ela existe no Evolution API.",
          });
        }

        return {
          success: true,
          message: "Instância desconectada! Agora você pode gerar um novo QR Code.",
        };
      } catch (error) {
        console.error("[QR Code] Disconnect error:", error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao desconectar: ${(error as Error).message}`,
        });
      }
    }),
});
