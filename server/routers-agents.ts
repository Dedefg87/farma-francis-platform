/**
 * Agent performance router.
 *
 * Sources of truth:
 * - conversations (assignment + status)
 * - conversation_messages (agent activity + response time)
 *
 * Optional:
 * - survey_responses (may not exist in some DBs)
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  conversations,
  users,
  conversationMessages,
  surveyResponses,
} from "../drizzle/schema";
import { desc, eq, gte, sql } from "drizzle-orm";

type TimeRange = "7d" | "30d" | "90d" | "all";

function startDateFromRange(range: TimeRange) {
  if (range === "all") return undefined;
  const days = parseInt(range, 10);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function dbErrCode(e: any) {
  return e?.cause?.code || e?.code;
}

function isMissingTable(e: any) {
  const code = dbErrCode(e);
  const msg = String(e?.cause?.sqlMessage || e?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist");
}

async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (isMissingTable(e)) {
      console.log(`[agents] Ignorando ${label}: tabela ausente`);
      return fallback;
    }
    throw e;
  }
}

function sqlJoinNumbers(ids: number[]) {
  return sql.join(
    ids.map(id => sql`${id}`),
    sql`, `
  );
}

function pickPrimaryAgentId(params: {
  assignedTo: number | null;
  lastAgentSenderId: number | null;
}) {
  return params.assignedTo ?? params.lastAgentSenderId;
}

async function computeAgentsWithMetrics(
  db: any,
  input: { timeRange: TimeRange }
) {
  const startDate = startDateFromRange(input.timeRange);

  const allAgents = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
  const agentIds = allAgents.map((a: any) => a.id).filter(Boolean);

  // Pull conversations with activity in range
  const convs = await db
    .select()
    .from(conversations)
    .where(
      startDate
        ? sql`(${conversations.openedAt} >= ${startDate} OR ${conversations.lastMessageAt} >= ${startDate})`
        : undefined
    );

  const conversationIds = convs.map((c: any) => c.id);

  // Aggregate customer first message per conversation
  const firstCustomerRows = await safe<any[]>(
    "conversation_messages(firstCustomer)",
    async () => {
      if (conversationIds.length === 0) return [];
      // Use the time range as anchor: response time should be computed from the
      // first customer message inside the range.
      return (await db.execute(sql`
        SELECT conversation_id AS conversationId,
               MIN(created_at) AS firstCustomerAt
        FROM conversation_messages
        WHERE sender_type = 'customer'
          AND conversation_id IN (${sqlJoinNumbers(conversationIds)})
          ${startDate ? sql`AND created_at >= ${startDate}` : sql``}
        GROUP BY conversation_id
      `)) as any;
    },
    []
  );

  const firstCustomerAtByConvId = new Map<number, number>();
  for (const r of firstCustomerRows as any[]) {
    const conversationId = Number((r as any).conversationId);
    const ts = (r as any).firstCustomerAt
      ? new Date((r as any).firstCustomerAt).getTime()
      : NaN;
    if (!Number.isNaN(ts)) firstCustomerAtByConvId.set(conversationId, ts);
  }

  // Aggregate per (conversation, agent) stats for agent messages
  const agentStatsRows = await safe<any[]>(
    "conversation_messages(perAgent)",
    async () => {
      if (conversationIds.length === 0 || agentIds.length === 0) return [];
      // Compute agent stats starting from the first customer message in-range.
      // This avoids negative/incorrect response times when the conversation started
      // before the selected time range.
      return (await db.execute(sql`
        SELECT m.conversation_id AS conversationId,
               m.sender_id AS senderId,
               MIN(m.created_at) AS firstAgentAt,
               MAX(m.created_at) AS lastAgentAt,
               COUNT(*) AS agentMsgCount
        FROM conversation_messages m
        INNER JOIN (
          SELECT conversation_id, MIN(created_at) AS firstCustomerAt
          FROM conversation_messages
          WHERE sender_type = 'customer'
            AND conversation_id IN (${sqlJoinNumbers(conversationIds)})
            ${startDate ? sql`AND created_at >= ${startDate}` : sql``}
          GROUP BY conversation_id
        ) fc ON fc.conversation_id = m.conversation_id
        WHERE m.sender_type = 'agent'
          AND m.sender_id IS NOT NULL
          AND m.conversation_id IN (${sqlJoinNumbers(conversationIds)})
          AND m.created_at >= fc.firstCustomerAt
        GROUP BY m.conversation_id, m.sender_id
      `)) as any;
    },
    []
  );

  const statsByConvAgent = new Map<
    string,
    { firstAgentAt?: number; lastAgentAt?: number; agentMsgCount: number }
  >();
  const lastAgentSenderByConvId = new Map<number, number>();
  const lastActiveAtByAgentId = new Map<number, number>();

  // Decide last agent sender per conversation using MAX(lastAgentAt)
  const bestByConv = new Map<number, { senderId: number; lastTs: number }>();

  for (const row of agentStatsRows as any[]) {
    const conversationId = Number((row as any).conversationId);
    const senderId = Number((row as any).senderId);
    const firstAgentAt = (row as any).firstAgentAt
      ? new Date((row as any).firstAgentAt).getTime()
      : undefined;
    const lastAgentAt = (row as any).lastAgentAt
      ? new Date((row as any).lastAgentAt).getTime()
      : undefined;
    const agentMsgCount = Number((row as any).agentMsgCount || 0);

    statsByConvAgent.set(`${conversationId}:${senderId}`, {
      firstAgentAt,
      lastAgentAt,
      agentMsgCount,
    });

    if (lastAgentAt !== undefined) {
      const prevAgentLast = lastActiveAtByAgentId.get(senderId);
      if (prevAgentLast === undefined || lastAgentAt > prevAgentLast) {
        lastActiveAtByAgentId.set(senderId, lastAgentAt);
      }

      const prevConv = bestByConv.get(conversationId);
      if (!prevConv || lastAgentAt > prevConv.lastTs) {
        bestByConv.set(conversationId, { senderId, lastTs: lastAgentAt });
      }
    }
  }

  bestByConv.forEach((v, conversationId) => {
    lastAgentSenderByConvId.set(conversationId, v.senderId);
  });

  // Optional surveys
  const surveys = await safe<any[]>(
    "survey_responses",
    async () => {
      const q = startDate
        ? db
            .select()
            .from(surveyResponses)
            .where(gte(surveyResponses.createdAt, startDate))
        : db.select().from(surveyResponses);
      return (await q) as any;
    },
    []
  );

  const surveyAggByAgentId = new Map<
    number,
    { total: number; count: number }
  >();
  for (const s of surveys as any[]) {
    const agentId = Number((s as any).agentId);
    if (!agentId) continue;
    const prev = surveyAggByAgentId.get(agentId) || { total: 0, count: 0 };
    surveyAggByAgentId.set(agentId, {
      total: prev.total + Number((s as any).rating || 0),
      count: prev.count + 1,
    });
  }

  // Group conversations by primary agent
  const convsByPrimaryAgentId = new Map<number, any[]>();
  for (const c of convs as any[]) {
    const lastAgentSenderId = lastAgentSenderByConvId.get(c.id) ?? null;
    const primaryId = pickPrimaryAgentId({
      assignedTo: c.assignedTo ?? null,
      lastAgentSenderId,
    });
    if (!primaryId) continue;
    const list = convsByPrimaryAgentId.get(primaryId) || [];
    list.push(c);
    convsByPrimaryAgentId.set(primaryId, list);
  }

  const agentsWithMetrics = allAgents.map((a: any) => {
    const agentConvs = convsByPrimaryAgentId.get(a.id) || [];
    const totalTickets = agentConvs.length;
    const resolvedTickets = agentConvs.filter(
      (c: any) => c.status === "closed"
    ).length;
    const activeTickets = agentConvs.filter(
      (c: any) => c.status === "open" || c.status === "assigned"
    ).length;

    // Avg response time (min)
    let sumRespMin = 0;
    let nResp = 0;

    // Message count
    let msgCount = 0;

    for (const c of agentConvs) {
      const firstCustomerAt = firstCustomerAtByConvId.get(c.id);
      const st = statsByConvAgent.get(`${c.id}:${a.id}`);
      if (st?.agentMsgCount) msgCount += st.agentMsgCount;
      if (!firstCustomerAt || !st?.firstAgentAt) continue;
      const diffMin = (st.firstAgentAt - firstCustomerAt) / (1000 * 60);
      if (diffMin > 0 && diffMin < 1440) {
        sumRespMin += diffMin;
        nResp += 1;
      }
    }

    const avgResponseTime = nResp > 0 ? sumRespMin / nResp : 0;

    // Avg resolution time (h)
    const resolvedConvs = agentConvs.filter(
      (c: any) => c.status === "closed" && c.openedAt && c.closedAt
    );
    let avgResolutionTime = 0;
    if (resolvedConvs.length > 0) {
      const totalMs = resolvedConvs.reduce((sum: number, c: any) => {
        return (
          sum +
          (new Date(c.closedAt).getTime() - new Date(c.openedAt).getTime())
        );
      }, 0);
      avgResolutionTime = totalMs / resolvedConvs.length / (1000 * 60 * 60);
    }

    const surveyAgg = surveyAggByAgentId.get(a.id);
    const satisfactionRate =
      surveyAgg && surveyAgg.count > 0
        ? (surveyAgg.total / (surveyAgg.count * 5)) * 100
        : 0;

    const lastActiveAtTs = lastActiveAtByAgentId.get(a.id);

    const badges: string[] = [];
    if (satisfactionRate >= 90) badges.push("🏆 Top Performer");
    if (avgResponseTime > 0 && avgResponseTime < 5)
      badges.push("⚡ Resposta Rápida");
    if (resolvedTickets >= 50) badges.push("💪 Produtivo");
    if (activeTickets >= 10) badges.push("📌 Muito Ativo");

    return {
      id: a.id,
      name: a.name || a.email || `Agente ${a.id}`,
      email: a.email,
      avatar: (a.name || a.email || "AG")
        .trim()
        .split(/\s+/)
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      totalTickets,
      resolvedTickets,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      satisfactionRate: Math.round(satisfactionRate),
      activeTickets,
      agentMsgCount: msgCount,
      lastActiveAt: lastActiveAtTs ? new Date(lastActiveAtTs) : null,
      badges,
      trend: "stable" as const,
      trendValue: 0,
    };
  });

  return { agentsWithMetrics, hasSurveyData: surveys.length > 0 };
}

export const agentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
        sortBy: z
          .enum(["satisfaction", "resolved", "response_time", "active"])
          .default("satisfaction"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Ensure input is defined, using defaults if not provided
      const safeInput = input ?? {};
      const { page = 1, pageSize = 20, sortBy = "satisfaction", timeRange = "30d" } = safeInput;
      const { agentsWithMetrics } = await computeAgentsWithMetrics(db, {
        timeRange,
      });

      const sorted = agentsWithMetrics.sort((a: any, b: any) => {
        switch (sortBy) {
          case "satisfaction":
            return b.satisfactionRate - a.satisfactionRate;
          case "resolved":
            return b.resolvedTickets - a.resolvedTickets;
          case "response_time":
            return a.avgResponseTime - b.avgResponseTime;
          case "active":
            return b.activeTickets - a.activeTickets;
          default:
            return 0;
        }
      });

      const offset = (page - 1) * pageSize;
      return sorted.slice(offset, offset + pageSize);
    }),

  getChartData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const startDate = startDateFromRange(input.timeRange);

      const convs = await db
        .select({
          openedAt: conversations.openedAt,
          status: conversations.status,
        })
        .from(conversations)
        .where(startDate ? gte(conversations.openedAt, startDate) : undefined);

      const surveys = await safe<any[]>(
        "survey_responses(chart)",
        async () => {
          const q = startDate
            ? db
                .select({
                  createdAt: surveyResponses.createdAt,
                  rating: surveyResponses.rating,
                })
                .from(surveyResponses)
                .where(gte(surveyResponses.createdAt, startDate))
            : db
                .select({
                  createdAt: surveyResponses.createdAt,
                  rating: surveyResponses.rating,
                })
                .from(surveyResponses);
          return (await q) as any;
        },
        []
      );

      const byIso: Record<
        string,
        { opened: number; resolved: number; satSum: number; satN: number }
      > = {};
      for (const c of convs as any[]) {
        if (!c.openedAt) continue;
        const iso = new Date(c.openedAt).toISOString().slice(0, 10);
        byIso[iso] = byIso[iso] || {
          opened: 0,
          resolved: 0,
          satSum: 0,
          satN: 0,
        };
        byIso[iso].opened += 1;
        if (c.status === "closed") byIso[iso].resolved += 1;
      }

      for (const s of surveys as any[]) {
        if (!(s as any).createdAt) continue;
        const iso = new Date((s as any).createdAt).toISOString().slice(0, 10);
        byIso[iso] = byIso[iso] || {
          opened: 0,
          resolved: 0,
          satSum: 0,
          satN: 0,
        };
        byIso[iso].satSum += Number((s as any).rating || 0);
        byIso[iso].satN += 1;
      }

      return Object.keys(byIso)
        .sort()
        .map(iso => {
          const d = byIso[iso];
          const [, m, day] = iso.split("-");
          return {
            date: `${day}/${m}`,
            tickets: d.opened,
            resolved: d.resolved,
            satisfacao:
              d.satN > 0 ? Math.round((d.satSum / d.satN / 5) * 100) : 0,
          };
        });
    }),

  getInsights: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { agentsWithMetrics, hasSurveyData } =
        await computeAgentsWithMetrics(db, { timeRange: input.timeRange });
      if (!agentsWithMetrics || agentsWithMetrics.length === 0) {
        return [
          "Sem dados suficientes para gerar insights no período selecionado.",
        ];
      }

      const insights: string[] = [];
      const byResolved = [...agentsWithMetrics].sort(
        (a: any, b: any) => b.resolvedTickets - a.resolvedTickets
      );
      const byResponse = [...agentsWithMetrics]
        .filter((a: any) => a.avgResponseTime > 0)
        .sort((a: any, b: any) => a.avgResponseTime - b.avgResponseTime);
      const bySatisfaction = [...agentsWithMetrics].sort(
        (a: any, b: any) => b.satisfactionRate - a.satisfactionRate
      );

      if (byResolved[0]?.resolvedTickets > 0) {
        insights.push(
          `• ${byResolved[0].name} lidera em tickets resolvidos: ${byResolved[0].resolvedTickets}.`
        );
      }
      if (byResponse[0]) {
        insights.push(
          `• ${byResponse[0].name} tem o menor tempo médio de resposta: ${byResponse[0].avgResponseTime.toFixed(1)}min.`
        );
      }
      if (hasSurveyData && bySatisfaction[0]?.satisfactionRate > 0) {
        insights.push(
          `• ${bySatisfaction[0].name} lidera em satisfação: ${bySatisfaction[0].satisfactionRate}%.`
        );
      }

      const totalTickets = agentsWithMetrics.reduce(
        (sum: number, a: any) => sum + (a.totalTickets || 0),
        0
      );
      const totalResolved = agentsWithMetrics.reduce(
        (sum: number, a: any) => sum + (a.resolvedTickets || 0),
        0
      );
      const resolutionRate =
        totalTickets > 0 ? (totalResolved / totalTickets) * 100 : 0;
      insights.push(
        `• Taxa de resolução da equipe: ${resolutionRate.toFixed(0)}%.`
      );

      const activeCount = agentsWithMetrics.filter(
        (a: any) => (a.activeTickets || 0) > 0
      ).length;
      insights.push(
        `• ${activeCount} agente(s) com tickets ativos no momento.`
      );

      if (!hasSurveyData) {
        insights.push("• Satisfação: ainda sem dados de pesquisa no banco.");
      }

      return insights;
    }),

  getRecentConversations: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        limit: z.number().min(1).max(50).default(15),
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const startDate = startDateFromRange(input.timeRange);

      const assigned = await db
        .select()
        .from(conversations)
        .where(
          startDate
            ? sql`${conversations.assignedTo} = ${input.agentId} AND (${conversations.openedAt} >= ${startDate} OR ${conversations.lastMessageAt} >= ${startDate})`
            : eq(conversations.assignedTo, input.agentId)
        );

      const byMsgs = await safe<any[]>(
        "conversation_messages(recentByAgent)",
        async () => {
          return (await db.execute(sql`
            SELECT DISTINCT conversation_id AS conversationId
            FROM conversation_messages
            WHERE sender_type = 'agent'
              AND sender_id = ${input.agentId}
              ${startDate ? sql`AND created_at >= ${startDate}` : sql``}
          `)) as any;
        },
        []
      );

      const idSet = new Set<number>(assigned.map((c: any) => c.id));
      for (const r of byMsgs as any[])
        idSet.add(Number((r as any).conversationId));
      const ids = Array.from(idSet);
      if (ids.length === 0) return [];

      const convs = await db
        .select()
        .from(conversations)
        .where(sql`${conversations.id} IN (${sqlJoinNumbers(ids)})`)
        .orderBy(desc(conversations.lastMessageAt));

      return convs.slice(0, input.limit).map((c: any) => ({
        id: c.id,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        channel: c.channel,
        status: c.status,
        openedAt: c.openedAt,
        lastMessageAt: c.lastMessageAt,
        closedAt: c.closedAt,
      }));
    }),
});
