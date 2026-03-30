import { Request, Response, Router } from "express";
import { getDb } from "../db";
import { eq, sql, desc } from "drizzle-orm";
import {
  broadcastLists as broadcastLists2,
  broadcastListMembers as broadcastListMembers2,
  conversations,
  conversationMessages,
  users,
  customers,
  receivedMessages,
  integrationSettings,
  processedWebhookMessages,
} from "../../drizzle/schema";

console.log("[DebugRouter] module loaded"); // Log de carregamento

const router = Router();

// GET /api/debug/broadcast-list
router.get("/broadcast-list", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const offset = 0;
    const limit = 20;

    const [lists] = await db
      .select({
        id: broadcastLists2.id,
        name: broadcastLists2.name,
        description: broadcastLists2.description,
        memberCount: sql<number>`COUNT(DISTINCT ${broadcastListMembers2.customerId})`.as("memberCount"),
        lastSentAt: broadcastLists2.lastSentAt,
        createdAt: broadcastLists2.createdAt,
      })
      .from(broadcastLists2)
      .leftJoin(broadcastListMembers2, eq(broadcastLists2.id, broadcastListMembers2.listId))
      .groupBy(
        broadcastLists2.id,
        broadcastLists2.name,
        broadcastLists2.description,
        broadcastLists2.lastSentAt,
        broadcastLists2.createdAt
      )
      .orderBy(desc(broadcastLists2.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ success: true, lists, count: lists.length });
  } catch (err: any) {
    console.error("[debug/broadcast-list] Error:", err);
    res.status(500).json({
      error: err.message,
      sql: err.sql,
      stack: err.stack,
      sqlMessage: err.sqlMessage,
    });
  }
});

// GET /api/debug/auth-test
router.get("/auth-test", async (req, res) => {
  try {
    console.log("[AuthTest] Endpoint called");
    const results: any = {};
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      cookieHeader.split(";").forEach((pair) => {
        const [name, ...rest] = pair.trim().split("=");
        if (name) cookies[name] = rest.join("=");
      });
    }
    const sessionCookie = cookies["farma-francis-auth"];

    results.cookiePresent = !!sessionCookie;
    results.cookieLength = sessionCookie?.length || 0;
    results.cookieSecretLength = process.env.JWT_SECRET?.length || 0;
    results.cookieSecretDefined = !!process.env.JWT_SECRET;

    if (!sessionCookie) {
      return res.json({
        success: false,
        message: "Cookie farma-francis-auth não encontrado",
        results,
      });
    }

    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    try {
      const { payload } = await jwtVerify(sessionCookie, secret, {
        algorithms: ["HS256"],
      });
      results.jwtVerify = "SUCCESS";
      results.payload = payload;

      const openId = payload.openId as string;
      results.openId = openId;

      if (!openId) {
        results.error = "openId não encontrado no payload do JWT";
        return res.json({ success: false, results });
      }

      const { getUserByOpenId } = await import("../db");
      const user = await getUserByOpenId(openId);

      results.userFound = !!user;
      if (user) {
        results.user = {
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      } else {
        results.error = "Usuário com openId não encontrado no banco";
      }

      results.appIdInToken = payload.appId;
      results.expectedAppId = process.env.APP_ID;

      res.json({
        success: !!user,
        message: user ? "Autenticação OK" : "Usuário não encontrado no banco",
        results,
      });
    } catch (jwtError: any) {
      results.jwtVerify = "FAILED";
      results.jwtError = jwtError.message || String(jwtError);
      res.json({
        success: false,
        message: "JWT verification falhou",
        results,
      });
    }
  } catch (err: any) {
    console.error("[AuthTest] Error:", err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// GET /api/debug/server-logs
router.get("/server-logs", async (req, res) => {
  res.json({ message: "Not implemented" });
});

// GET /api/debug/media-messages (the second definition, line 1136)
router.get("/media-messages", async (req, res) => {
  try {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [rows]: any = await pool.execute(
      `SELECT id, conversation_id, sender_type,
       LEFT(content, 100) as content_preview,
       file_url IS NOT NULL as has_file_url,
       LENGTH(file_url) as file_url_length,
       LEFT(file_url, 50) as file_url_preview,
       file_type, created_at
       FROM conversation_messages
       ORDER BY id DESC
       LIMIT 20`
    );

    await pool.end();
    res.json({ count: rows.length, messages: rows });
  } catch (error) {
    console.error("[Debug Media Messages]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/last-media-payload
router.get("/last-media-payload", async (req, res) => {
  try {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [rows]: any = await pool.execute(
      `SELECT id, created_at FROM conversation_messages
       WHERE file_type IS NOT NULL
       ORDER BY id DESC LIMIT 1`
    );
    await pool.end();

    res.json({ latestMediaMessage: rows[0] || null });
  } catch (error) {
    console.error("[Debug Last Media Payload]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/test-evolution-media
router.get("/test-evolution-media", async (req, res) => {
  try {
    const { testEvolutionMedia } = await import("../services/whatsapp");
    const result = await testEvolutionMedia();
    res.json(result);
  } catch (error) {
    console.error("[Debug Test Evolution Media]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/conversation-messages-with-media
router.get("/conversation-messages-with-media", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [rows]: any = await pool.execute(
      `SELECT cm.id, cm.conversation_id, cm.content, cm.file_url, cm.file_type, cm.file_name, cm.created_at,
              c.remote_jid as customer_jid
       FROM conversation_messages cm
       LEFT JOIN conversations c ON cm.conversation_id = c.id
       WHERE cm.file_type IS NOT NULL
       ORDER BY cm.id DESC
       LIMIT ?`,
      [limit]
    );

    await pool.end();
    res.json({ count: rows.length, messages: rows });
  } catch (error) {
    console.error("[Debug Conversation Messages With Media]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/conversations
router.get("/conversations", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const convs = await db
      .select({
        id: conversations.id,
        remoteJid: conversations.remoteJid,
        customerName: conversations.customerName,
        status: conversations.status,
        assignedTo: conversations.assignedTo,
        lastActivity: conversations.lastActivity,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .orderBy(desc(conversations.lastActivity))
      .limit(limit);

    res.json({ success: true, conversations: convs, count: convs.length });
  } catch (err: any) {
    console.error("[debug/conversations] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/received-messages
router.get("/received-messages", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const msgs = await db
      .select({
        id: receivedMessages.id,
        remoteJid: receivedMessages.remoteJid,
        messageId: receivedMessages.messageId,
        messageType: receivedMessages.messageType,
        content: receivedMessages.content,
        createdAt: receivedMessages.createdAt,
      })
      .from(receivedMessages)
      .orderBy(desc(receivedMessages.createdAt))
      .limit(limit);

    res.json({ success: true, messages: msgs, count: msgs.length });
  } catch (err: any) {
    console.error("[debug/received-messages] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/conversation/:id
router.get("/conversation/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, Number(id)))
      .limit(1);

    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    console.error("[debug/conversation/:id] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/recent-messages
router.get("/recent-messages", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  try {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [rows]: any = await pool.execute(
      `SELECT cm.id, cm.conversation_id, cm.sender_type, cm.content, cm.file_type, cm.file_name, cm.created_at,
              c.remote_jid as customer_jid, c.customer_name
       FROM conversation_messages cm
       LEFT JOIN conversations c ON cm.conversation_id = c.id
       ORDER BY cm.id DESC
       LIMIT ?`,
      [limit]
    );

    await pool.end();
    res.json({ count: rows.length, messages: rows });
  } catch (error) {
    console.error("[Debug Recent Messages]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/messages/:phone
router.get("/messages/:phone", async (req, res) => {
  const { phone } = req.params;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const msgs = await db
      .select({
        id: conversationMessages.id,
        conversationId: conversationMessages.conversationId,
        senderId: conversationMessages.senderId,
        senderType: conversationMessages.senderType,
        content: conversationMessages.content,
        fileUrl: conversationMessages.fileUrl,
        fileType: conversationMessages.fileType,
        fileName: conversationMessages.fileName,
        createdAt: conversationMessages.createdAt,
      })
      .from(conversationMessages)
      .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
      .where(eq(conversations.remoteJid, phone))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(100);

    res.json({ success: true, messages: msgs, count: msgs.length });
  } catch (err: any) {
    console.error("[debug/messages/:phone] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/webhooks
router.get("/webhooks", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const hooks = await db
      .select()
      .from(processedWebhookMessages)
      .orderBy(desc(processedWebhookMessages.processedAt))
      .limit(limit);

    res.json({ success: true, webhooks: hooks, count: hooks.length });
  } catch (err: any) {
    console.error("[debug/webhooks] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/contacts-by-hour
router.get("/contacts-by-hour", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const stats = await db
      .select({
        hour: sql<number>`HOUR(created_at)`.as("hour"),
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(customers)
      .groupBy(sql`HOUR(created_at)`)
      .orderBy(sql`hour ASC`);

    res.json({ success: true, stats });
  } catch (err: any) {
    console.error("[debug/contacts-by-hour] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const [convCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(conversations);
    const [msgCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(conversationMessages);
    const [custCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(customers);
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [queueCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(queues);

    res.json({
      success: true,
      stats: {
        conversations: convCount.count,
        messages: msgCount.count,
        customers: custCount.count,
        users: userCount.count,
        queues: queueCount.count,
      },
    });
  } catch (err: any) {
    console.error("[debug/dashboard] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/users
router.get("/users", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const usrs = await db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    res.json({ success: true, users: usrs, count: usrs.length });
  } catch (err: any) {
    console.error("[debug/users] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/check-broadcast-tables
router.get("/check-broadcast-tables", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const tables = ["broadcast_lists", "broadcast_list_members", "broadcast_messages", "broadcast_members_sent"];
    const results: any = {};

    for (const table of tables) {
      const [countResult] = await db.execute(sql`SELECT COUNT(*) as cnt FROM ${sql.raw(table)}`);
      const count = (countResult as any[])[0]?.cnt || 0;
      results[table] = count;
    }

    res.json({ success: true, counts: results });
  } catch (err: any) {
    console.error("[debug/check-broadcast-tables] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/evolution-config
router.get("/evolution-config", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const [settings] = await db
      .select({ config: integrationSettings.config })
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    res.json({ success: true, config: settings ? settings.config : null });
  } catch (err: any) {
    console.error("[debug/evolution-config] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/create-broadcast-tables
router.get("/create-broadcast-tables", async (req, res) => {
  try {
    const { runBroadcastMigrations } = await import("../services/broadcast-queue");
    await runBroadcastMigrations();
    res.json({ success: true, message: "Broadcast tables created/verified" });
  } catch (err: any) {
    console.error("[debug/create-broadcast-tables] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/list-active-raw
router.get("/list-active-raw", async (req, res) => {
  try {
    const { getActiveAgentsRaw } = await import("../helpers/agent-availability");
    const agents = await getActiveAgentsRaw();
    res.json({ success: true, agents });
  } catch (err: any) {
    console.error("[debug/list-active-raw] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/agent-names
router.get("/agent-names", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const agents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, "admin"));

    res.json({ success: true, agents });
  } catch (err: any) {
    console.error("[debug/agent-names] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/test-messages-sender
router.get("/test-messages-sender", async (req, res) => {
  try {
    const { sendTestMessage } = await import("../services/whatsapp");
    const result = await sendTestMessage();
    res.json(result);
  } catch (err: any) {
    console.error("[debug/test-messages-sender] Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/debug/compare-messages-tables
router.get("/compare-messages-tables", async (req, res) => {
  try {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [received] = await pool.execute(`SELECT COUNT(*) as total FROM received_messages`);
    const [conversation] = await pool.execute(`SELECT COUNT(*) as total FROM conversation_messages`);

    await pool.end();

    res.json({
      success: true,
      counts: {
        received_messages: (received as any[])[0]?.total || 0,
        conversation_messages: (conversation as any[])[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("[Debug Compare Messages Tables]", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/debug/conversations-messages-count
router.get("/conversations-messages-count", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const result: any = [];
    const conversationsList = await db.select({ id: conversations.id }).from(conversations);

    for (const conv of conversationsList) {
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conv.id));
      result.push({
        conversation_id: conv.id,
        message_count: countResult[0]?.count || 0,
      });
    }

    res.json({ success: true, counts: result });
  } catch (err: any) {
    console.error("[debug/conversations-messages-count] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
