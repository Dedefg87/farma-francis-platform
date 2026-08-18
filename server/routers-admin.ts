import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { and, eq, or, sql } from "drizzle-orm";
import { users, customers, conversations, conversationMessages } from "../drizzle/schema";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * 🔐 Admin Router — Direitos do Titular (LGPD)
 */
export const adminRouter = router({

  /**
   * 📤 Exportar todos os dados de uma pessoa
   * Busca por email ou CPF
   */
  exportUserData: protectedProcedure
    .input(
      z.object({
        identifier: z.string().min(3), // email ou CPF
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log("[Privacy Export] Exporting data for:", input.identifier);

      // Buscar usuário (por email ou CPF)
      const [user] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, input.identifier),
            sql`${users.cpf} = ${input.identifier}`
          )
        );

      // Buscar cliente
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          or(
            eq(customers.email, input.identifier),
            sql`${customers.cpf} = ${input.identifier}`
          )
        );

      // Buscar conversas do cliente
      let conversationList: any[] = [];
      let messageList: any[] = [];

      if (customer?.id) {
        conversationList = await db
          .select()
          .from(conversations)
          .where(eq(conversations.customerId, customer.id));

        if (conversationList.length > 0) {
          const convIds = conversationList.map((c) => c.id);
          messageList = await db
            .select()
            .from(conversationMessages)
            .where(
              sql`${conversationMessages.conversationId} IN (${convIds.join(",")})`
            );
        }
      }

      // Gerar arquivo JSON
      const exportData = {
        user,
        customer,
        conversations: conversationList,
        messages: messageList,
        exportedAt: new Date().toISOString(),
        policyVersion: "1.0"
      };

      // Salvar no sistema de arquivos do servidor para download
      const filename = `export-${input.identifier.replace(/[@.]/g, "_")}-${Date.now()}.json`;
      const filepath = join("/tmp", filename);
      writeFileSync(filepath, JSON.stringify(exportData, null, 2));

      console.log("[Privacy Export] File generated:", filepath);

      return {
        success: true,
        message: `Dados exportados com sucesso`,
        filename,
        user: user ? { id: user.id, email: user.email, name: user.name } : null,
        customer: customer ? { id: customer.id, phone: customer.phone } : null,
        totalMessages: messageList.length,
        totalConversations: conversationList.length,
      };
    }),

  /**
   * 🗑️ Excluir/anonimizar dados de uma pessoa
   * Mantém histórico obrigatório (mensagens de atendimento)
   */
  deleteUserData: protectedProcedure
    .input(
      z.object({
        identifier: z.string().min(3), // email ou CPF
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log("[Privacy Delete] Deleting data for:", input.identifier);

      // Anonimizar usuário
      await db
        .update(users)
        .set({
          name: "[EXCLUIDO]",
          email: null,
          // @ts-ignore
          cpf: null,
        })
        .where(
          or(
            eq(users.email, input.identifier),
            sql`${users.cpf} = ${input.identifier}`
          )
        );

      // Anonimizar cliente
      const result = await db
        .update(customers)
        .set({
          name: "[EXCLUIDO]",
          email: null,
          phone: null,
          cpf: null,
          address: null,
          cep: null,
          susId: null,
          responsibleDoctorName: null,
          deletedAt: new Date(),
        })
        // @ts-ignore
        .where(
          or(
            eq(customers.email, input.identifier),
            sql`${customers.cpf} = ${input.identifier}`
          )
        );

      console.log("[Privacy Delete] Rows affected:", result?.affectedRows || 0);

      return {
        success: true,
        message: `Dados anonimizados com sucesso. Mensagens de atendimento foram mantidas por compliance.`,
        rowsAffected: result?.affectedRows || 0,
      };
    }),

  /**
   * 📜 Listar serviços externos que recebem dados
   */
  listExternalServices: protectedProcedure
    .query(async () => {
      return {
        services: [
          {
            name: "Evolution API (Railway)",
            receives: ["Números WhatsApp", "Mensagens de texto"],
            country: "🇺🇸 Estados Unidos",
            purpose: "Envio/recebimento de mensagens WhatsApp",
          },
          {
            name: "Cloudflare R2",
            receives: ["Imagens/documentos de conversas"],
            country: "🇺🇸 Estados Unidos",
            purpose: "Armazenamento de mídia",
          },
          {
            name: "Google SSO",
            receives: ["Email", "Nome", "OpenID"],
            country: "🇺🇸 Estados Unidos",
            purpose: "Autenticação de agentes",
          },
          {
            name: "OpenRouter API",
            receives: ["Conteúdo de mensagens"],
            country: "🇺🇸 Estados Unidos",
            purpose: "Análise de IA (NLP)",
          },
          {
            name: "HuggingFace",
            receives: ["Texto de mensagens para análise"],
            country: "🇺🇸 Estados Unidos",
            purpose: "Análise de sentimento",
          },
          {
            name: "Telegram Bot API",
            receives: ["Tokens, IDs de usuários"],
            country: "🇷🇺 Rússia (servidores globais)",
            purpose: "Notificações administrativas",
          },
        ],
        brServices: [
          {
            name: "Railway PostgreSQL (MySQL compatível)",
            country: "🇺🇸 Estados Unidos",
            receives: ["Todos os dados do sistema"],
            purpose: "Banco de dados principal",
          },
        ],
        note: "Todos os serviços estão fora do Brasil.",
      };
    }),
});
