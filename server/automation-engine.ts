import { logger } from "./_core/logger";
import { getTemplate, AutomationConfig, FlowConfig } from "./templates";
import { sseManager, EVENTS } from "./_core/sse";
import { getDb } from "./db";
import {
  customers,
  conversations,
  conversationMessages,
} from "../drizzle/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface AutomationContext {
  customerId?: number;
  conversationId?: number;
  channel?: string;
  data?: Record<string, unknown>;
  sentiment?: "positive" | "neutral" | "negative";
  score?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AutomationResult {
  success: boolean;
  actionsExecuted: string[];
  errors: string[];
  context: AutomationContext;
}

export class AutomationEngine {
  private template: Template;
  private context: AutomationContext;
  private executionLog: string[] = [];

  constructor(templateType: string, context: AutomationContext = {}) {
    const template = getTemplate(templateType as any);
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }
    this.template = template;
    this.context = context;
  }

  async executeAutomation(automationId: string): Promise<AutomationResult> {
    const automation = this.template.automations?.find(
      (a: any) => a.id === automationId
    );
    if (!automation || !automation.enabled) {
      return {
        success: false,
        actionsExecuted: [],
        errors: ["Automation not found or disabled"],
        context: this.context,
      };
    }

    logger.info({
      type: "automation",
      automationId,
      template: this.template.id,
    });

    try {
      const conditionsMet = await this.checkConditions(automation.conditions);
      if (!conditionsMet) {
        logger.info({
          type: "automation",
          automationId,
          result: "conditions_not_met",
        });
        return {
          success: true,
          actionsExecuted: [],
          errors: [],
          context: this.context,
        };
      }

      const results = await this.executeActions(automation.actions);

      logger.info({
        type: "automation",
        automationId,
        actionsExecuted: results.length,
      });

      return {
        success: true,
        actionsExecuted: results,
        errors: [],
        context: this.context,
      };
    } catch (error) {
      logger.error(error as Error, { type: "automation", automationId });
      return {
        success: false,
        actionsExecuted: [],
        errors: [(error as Error).message],
        context: this.context,
      };
    }
  }

  async executeFlow(
    flowId: string,
    initialData?: Record<string, unknown>
  ): Promise<FlowExecutionResult> {
    const flow = this.template.defaultFlows.find(f => f.id === flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    logger.info({ type: "flow", flowId, template: this.template.id });

    const result: FlowExecutionResult = {
      success: true,
      stepsExecuted: [],
      currentStep: null,
      data: initialData || {},
      errors: [],
    };

    try {
      await this.executeStep(flow.steps[0], flow, result);

      logger.info({ type: "flow", flowId, steps: result.stepsExecuted.length });

      return result;
    } catch (error) {
      logger.error(error as Error, { type: "flow", flowId });
      return {
        success: false,
        stepsExecuted: result.stepsExecuted,
        currentStep: null,
        data: result.data,
        errors: [(error as Error).message],
      };
    }
  }

  private async executeStep(
    step: any,
    flow: FlowConfig,
    result: FlowExecutionResult
  ): Promise<void> {
    if (!step) return;

    result.currentStep = step.id;
    result.stepsExecuted.push({
      id: step.id,
      type: step.type,
      name: step.name,
      timestamp: new Date().toISOString(),
    });

    switch (step.type) {
      case "message":
        await this.executeMessageAction(step.config, result);
        break;
      case "ai":
        await this.executeAIAction(step.config, result);
        break;
      case "condition":
        await this.executeCondition(step, flow, result);
        return;
      case "wait":
        await this.executeWaitAction(step.config);
        break;
      case "transfer":
        await this.executeTransferAction(step.config);
        break;
      case "notification":
        await this.executeNotificationAction(step.config);
        break;
      case "action":
        await this.executeCustomAction(step.config, result);
        break;
    }

    if (step.next) {
      const nextStep = flow.steps.find(s => s.id === step.next);
      await this.executeStep(nextStep, flow, result);
    }
  }

  private async executeMessageAction(
    config: Record<string, unknown>,
    result: FlowExecutionResult
  ): Promise<void> {
    const template = config.template as string;
    const message = await this.renderTemplate(template, result.data);

    // Send to database
    if (this.context.conversationId) {
      const db = await getDb();
      if (db) {
        const [msg] = await db
          .insert(conversationMessages)
          .values({
            conversationId: this.context.conversationId,
            senderId: null,
            senderType: "agent", // Changed from 'customer' to 'agent' since this is automation
            content: message,
            createdAt: new Date(),
          })
          .returning();

        // Emit SSE event for real-time frontend update
        sseManager.emitToUser(String(this.context.customerId), {
          type: EVENTS.MESSAGE_NEW,
          data: {
            conversationId: this.context.conversationId,
            message: {
              id: msg.insertId,
              content: message,
              senderType: "agent",
              createdAt: new Date().toISOString(),
              direction: "outbound",
            },
          },
          timestamp: Date.now(),
        });

        // Also emit conversation update to refresh conversation list
        sseManager.emitToUser(String(this.context.customerId), {
          type: EVENTS.CONVERSATION_UPDATE,
          data: {
            conversationId: this.context.conversationId,
            lastMessageAt: new Date().toISOString(),
            lastMessage: message,
          },
          timestamp: Date.now(),
        });
      }
    }

    this.executionLog.push(`Message sent: ${template}`);
  }

  private async executeAIAction(
    config: Record<string, unknown>,
    result: FlowExecutionResult
  ): Promise<void> {
    const action = config.action as string;

    switch (action) {
      case "identify_customer":
        result.data.customerInfo = await this.identifyCustomer();
        break;
      case "classify_intent":
        result.data.intent = await this.classifyIntent(
          result.data.message as string
        );
        break;
      case "calculate_rfm_score":
        result.data.score = await this.calculateRFMScore();
        break;
      case "personalized_recommendation":
        result.data.recommendations =
          await this.getPersonalizedRecommendations();
        break;
      case "suggest_slots":
        result.data.availableSlots = await this.getAvailableSlots();
        break;
      case "confirm_appointment":
        result.data.confirmation = await this.confirmAppointment(result.data);
        break;
      case "classify_urgency":
        result.data.urgency = await this.classifyUrgency(
          result.data.message as string
        );
        break;
      case "check_drug_interactions":
        result.data.interactions = await this.checkInteractions(
          result.data.medications as string[]
        );
        break;
      default:
        result.data.aiResult = `AI action: ${action}`;
    }

    this.executionLog.push(`AI action: ${action}`);
  }

  private async executeCondition(
    step: any,
    flow: FlowConfig,
    result: FlowExecutionResult
  ): Promise<void> {
    const condition = step.config;
    const fieldValue = this.getNestedValue(result.data, condition.field);

    let conditionMet = false;
    switch (condition.operator) {
      case "equals":
        conditionMet = fieldValue === condition.value;
        break;
      case "greater":
        conditionMet = (fieldValue as number) > (condition.value as number);
        break;
      case "less":
        conditionMet = (fieldValue as number) < (condition.value as number);
        break;
      case "contains":
        conditionMet = String(fieldValue).includes(String(condition.value));
        break;
    }

    const nextStepId = conditionMet ? condition.trueStep : condition.falseStep;
    const nextStep = flow.steps.find(s => s.id === nextStepId);

    this.executionLog.push(
      `Condition ${condition.field} ${condition.operator} ${condition.value}: ${conditionMet}`
    );

    await this.executeStep(nextStep, flow, result);
  }

  private async executeWaitAction(
    config: Record<string, unknown>
  ): Promise<void> {
    const duration = config.duration as number;
    this.executionLog.push(`Wait: ${duration}ms`);
    await new Promise(resolve =>
      setTimeout(resolve, Math.min(duration, 300000))
    );
  }

  private async executeTransferAction(
    config: Record<string, unknown>
  ): Promise<void> {
    const queue = config.queue as string;
    const priority = (config.priority as string) || "medium";

    this.context.metadata = {
      ...this.context.metadata,
      transferQueue: queue,
      transferPriority: priority,
    };

    logger.info({
      type: "transfer",
      queue,
      priority,
      customerId: this.context.customerId,
    });

    this.executionLog.push(`Transfer to: ${queue} (${priority})`);
  }

  private async executeNotificationAction(
    config: Record<string, unknown>
  ): Promise<void> {
    const message = config.message as string;

    if (this.context.customerId) {
      sseManager.emitToUser(String(this.context.customerId), {
        type: EVENTS.AGENT_STATUS,
        data: { type: "notification", message },
        timestamp: Date.now(),
      });
    }

    this.executionLog.push(`Notification: ${message}`);
  }

  private async executeCustomAction(
    config: Record<string, unknown>,
    result: FlowExecutionResult
  ): Promise<void> {
    const action = config.action as string;

    switch (action) {
      case "update_score":
        await this.updateScore(config.factors as Record<string, number>);
        break;
      case "add_tag":
        await this.addTag(config.tag as string);
        break;
      case "schedule_reminders":
        await this.scheduleReminders(result.data);
        break;
      case "book_appointment":
        result.data.bookingId = await this.bookAppointment(result.data);
        break;
      case "check_availability":
        result.data.slots = await this.getAvailableSlots();
        break;
      case "check_pending_refills":
        result.data.pendingRefills = await this.checkPendingRefills();
        break;
    }

    this.executionLog.push(`Action: ${action}`);
  }

  private async checkConditions(conditions: any[]): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(this.context, condition.field);
      let conditionMet = false;

      switch (condition.operator) {
        case "equals":
          conditionMet = fieldValue === condition.value;
          break;
        case "contains":
          conditionMet = String(fieldValue).includes(String(condition.value));
          break;
        case "greater":
          conditionMet = (fieldValue as number) > (condition.value as number);
          break;
        case "less":
          conditionMet = (fieldValue as number) < (condition.value as number);
          break;
      }

      if (!conditionMet) return false;
    }

    return true;
  }

  private async executeActions(actions: any[]): Promise<string[]> {
    const executed: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case "send_message":
          executed.push(`send_message: ${action.config.template}`);
          break;
        case "update_score":
          await this.updateScore(
            action.config.factors as Record<string, number>
          );
          executed.push("update_score");
          break;
        case "add_tag":
          await this.addTag(action.config.tag as string);
          executed.push("add_tag");
          break;
        case "notify_agent":
          executed.push("notify_agent");
          break;
        case "transfer":
          await this.executeTransferAction(action.config);
          executed.push("transfer");
          break;
        case "schedule_followup":
          executed.push(`schedule_followup: ${action.config.delay}`);
          break;
        case "create_task":
          executed.push(`create_task: ${action.config.type}`);
          break;
      }
    }

    return executed;
  }

  private async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const templates: Record<string, string> = {
      welcome_vip: `Olá! É um prazer tê-lo conosco novamente, {{name}}! Como posso ajudá-lo hoje?`,
      welcome_back: `Bem-vindo de volta! Sentimos sua falta! Em que posso ajudar?`,
      welcome_sales: `Olá! Bem-vindo à Farmácia Francis! Aqui você encontra os melhores produtos com as melhores ofertas!`,
      offer_assistance: "Em que posso ajudá-lo?",
      cart_reminder_light:
        "Notamos que você deixou itens no carrinho. Gostaria de finalizar a compra?",
      cart_reminder_personal:
        "Ei, {{name}}! Seus produtos favoritos ainda estão esperando por você!",
      cart_final_offer:
        "Última chance! 20% de desconto para concluir sua compra.",
      appointment_confirmed:
        "✅ Seu agendamento foi confirmado! Você receberá lembretes em breve.",
      reminder_24h: "⏰ Lembrete: Você tem uma consulta amanhã às {{time}}.",
      reminder_2h: "⏰ Sua consulta é em 2 horas! Não se atrase.",
      reminder_15m: "📍 Sua consulta começa em breve! Estamos te esperando.",
      refill_reminder: "💊 Chegou a hora de renovar seu {{product}}!",
      interaction_warning:
        "⚠️ Importante: Foi detectada uma possível interação medicamentosa.",
      pharma_escalation:
        "Um farmacêutico entrará em contato com você em breve.",
      no_show_message:
        "Percebemos que você não pôdeComparecer à consulta. Gostaria de reagendar?",
      vip_checkin:
        "Olá {{name}}! Como está sendo sua experiência com nossos produtos?",
    };

    let text = templates[templateName] || templateName;

    for (const [key, value] of Object.entries(data)) {
      text = text.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    return text;
  }

  private getNestedValue(obj: any, path: string): unknown {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }

  private async identifyCustomer(): Promise<Record<string, unknown>> {
    if (!this.context.customerId) return {};

    const db = await getDb();
    if (!db) return {};

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, this.context.customerId))
      .limit(1);

    return customer || {};
  }

  private async classifyIntent(message: string): Promise<string> {
    const keywords: Record<string, string[]> = {
      produto: ["produto", "comprar", "preço", "quanto", "valor", "tem"],
      duvida: ["duvida", "como", "posso", "você", "existe"],
      problema: ["problema", "erro", "não", "defeito", "reclamação"],
      agendamento: ["agendar", "horário", "consulta", "marcado"],
    };

    const lowerMessage = message.toLowerCase();
    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        return intent;
      }
    }

    return "outros";
  }

  private async calculateRFMScore(): Promise<number> {
    let score = 50;

    if (this.context.metadata?.recentPurchase) score += 20;
    if (this.context.metadata?.frequentBuyer) score += 15;
    if (this.context.metadata?.highValue) score += 15;

    return Math.min(100, score);
  }

  private async getPersonalizedRecommendations(): Promise<string[]> {
    return ["Vitamina D3 1000UI", "Omega 3 Premium", "Probiótico 50B UFC"];
  }

  private async getAvailableSlots(): Promise<string[]> {
    const slots: string[] = [];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      if (date.getDay() !== 0) {
        slots.push(`${date.toLocaleDateString("pt-BR")} às 09:00`);
        slots.push(`${date.toLocaleDateString("pt-BR")} às 14:00`);
        slots.push(`${date.toLocaleDateString("pt-BR")} às 16:00`);
      }
    }

    return slots.slice(0, 6);
  }

  private async confirmAppointment(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      confirmed: true,
      appointmentId: randomUUID(),
      ...data,
    };
  }

  private async classifyUrgency(message: string): Promise<string> {
    const urgentKeywords = [
      "urgente",
      "emergência",
      "agora",
      "dor intensa",
      "febre alta",
    ];
    const warningKeywords = ["preocupado", "não sei", "qual", "posso"];

    const lower = message.toLowerCase();

    if (urgentKeywords.some(kw => lower.includes(kw))) return "high";
    if (warningKeywords.some(kw => lower.includes(kw))) return "medium";
    return "low";
  }

  private async checkInteractions(
    medications: string[]
  ): Promise<Record<string, unknown>> {
    return {
      hasInteraction: false,
      interactions: [],
      severity: "none",
    };
  }

  private async updateScore(factors: Record<string, number>): Promise<void> {
    if (!this.context.customerId) return;

    logger.info({
      type: "score_update",
      customerId: this.context.customerId,
      factors,
    });
  }

  private async addTag(tag: string): Promise<void> {
    if (!this.context.customerId) return;

    const db = await getDb();
    if (!db) return;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, this.context.customerId))
      .limit(1);

    if (customer) {
      const existingTags = customer.tags
        ? JSON.parse(customer.tags as string)
        : [];
      if (!existingTags.includes(tag)) {
        existingTags.push(tag);
        await db
          .update(customers)
          .set({ tags: JSON.stringify(existingTags) })
          .where(eq(customers.id, this.context.customerId));
      }
    }
  }

  private async scheduleReminders(
    data: Record<string, unknown>
  ): Promise<void> {
    logger.info({ type: "schedule_reminders", appointmentId: data.bookingId });
  }

  private async bookAppointment(
    data: Record<string, unknown>
  ): Promise<string> {
    const appointmentId = uuidv4();
    logger.info({ type: "book_appointment", appointmentId, ...data });
    return appointmentId;
  }

  private async checkPendingRefills(): Promise<string[]> {
    return ["Omeprazol 20mg", "Losartana 50mg"];
  }
}

interface FlowExecutionResult {
  success: boolean;
  stepsExecuted: Array<{
    id: string;
    type: string;
    name: string;
    timestamp: string;
  }>;
  currentStep: string | null;
  data: Record<string, unknown>;
  errors: string[];
}

export async function executeTemplateAutomation(
  templateType: string,
  automationId: string,
  context: AutomationContext
): Promise<AutomationResult> {
  const engine = new AutomationEngine(templateType, context);
  return await engine.executeAutomation(automationId);
}

export async function executeTemplateFlow(
  templateType: string,
  flowId: string,
  context: AutomationContext,
  initialData?: Record<string, unknown>
): Promise<FlowExecutionResult> {
  const engine = new AutomationEngine(templateType, context);
  return await engine.executeFlow(flowId, initialData);
}

export default {
  AutomationEngine,
  executeTemplateAutomation,
  executeTemplateFlow,
};
