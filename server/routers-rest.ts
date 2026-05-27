import { Router } from "express";
import { getDb } from "./db";
import { customers, crmTasks, conversations, users } from "../drizzle/schema";
import { eq, like, or } from "drizzle-orm";
import { sendWhatsAppMessage } from "./messaging";
import { formatPhoneBR } from "./utils/phone";

// ============================================================
// REST ENDPOINTS PARA FLUXOS VISUAIS (templates)
// ============================================================

export const restRouter = Router();

// GET /api/contatos?telefone=XXX - Buscar contato pelo telefone
restRouter.get("/contatos", async (req, res) => {
  try {
    const { telefone } = req.query;
    if (!telefone || typeof telefone !== "string") {
      return res.status(400).json({ error: "telefone query parameter required" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const normalizedPhone = formatPhoneBR(telefone);
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, normalizedPhone))
      .limit(1);

    if (customer?.length === 0) {
      return res.json({ found: false });
    }

    return res.json({
      found: true,
      id: customer[0].id,
      nome: customer[0].name,
      telefone: customer[0].phone,
      email: customer[0].email,
    });
  } catch (err: unknown) {
    console.error("[REST] /contatos error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contatos - Criar contato
restRouter.post("/contatos", async (req, res) => {
  try {
    const { nome, telefone, origem, email } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const normalizedPhone = telefone ? formatPhoneBR(telefone) : null;
    
    const result = await db
      .insert(customers)
      .values({
        name: nome || "Cliente",
        phone: normalizedPhone || null,
        email: email || null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const insertId = result[0]?.insertId || result.insertId;
    return res.json({ id: insertId, success: true });
  } catch (err: unknown) {
    console.error("[REST] POST /contatos error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mensagens/enviar - Enviar mensagem via Evolution API
restRouter.post("/mensagens/enviar", async (req, res) => {
  try {
    const { telefone, mensagem, nome } = req.body;
    if (!telefone || !mensagem) {
      return res.status(400).json({ error: "telefone and mensagem required" });
    }

    const normalizedPhone = formatPhoneBR(telefone);
    
    const result = await sendWhatsAppMessage({
      to: normalizedPhone,
      message: mensagem,
      customerName: nome,
    });

    return res.json({
      success: true,
      externalId: result?.externalId || null,
      status: result?.status || "sent",
    });
  } catch (err: unknown) {
    console.error("[REST] /mensagens/enviar error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tarefas - Criar tarefa
restRouter.post("/tarefas", async (req, res) => {
  try {
    const { titulo, descricao, contato_id, telefone, origem, timestamp, status = "open" } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const result = await db
      .insert(crmTasks)
      .values({
        title: titulo || "Tarefa",
        description: descricao || null,
        status: status,
        assignedTo: null, // Será atribuído depois
        createdBy: null,
        relatedEntityType: "contact",
        relatedEntityId: contato_id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const taskId = result[0]?.insertId || result.insertId;
    return res.json({ id: taskId, success: true });
  } catch (err: unknown) {
    console.error("[REST] /tarefas error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/atendimentos/atribuir - Atribuir agente a um atendimento
restRouter.put("/atendimentos/atribuir", async (req, res) => {
  try {
    const { telefone, mensagem, agentId } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const normalizedPhone = formatPhoneBR(telefone);

    // Buscar conversa pelo telefone
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerPhone, normalizedPhone))
      .limit(1);

    if (!conv?.length) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    // Atribuir agente se fornecido
    if (agentId) {
      await db
        .update(conversations)
        .set({ assignedTo: agentId, status: "assigned" })
        .where(eq(conversations.id, conv[0].id));
    }

    return res.json({ success: true, conversationId: conv[0].id });
  } catch (err: unknown) {
    console.error("[REST] /atendimentos/atribuir error:", err);
    res.status(500).json({ error: err.message });
  }
});