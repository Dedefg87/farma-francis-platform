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
});
