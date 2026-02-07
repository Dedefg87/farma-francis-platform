import { Request, Response } from "express";
import { createContext } from "./context";
import { logger } from "./_core/logger";
import { sseManager, EVENTS } from "./_core/sse";
import { getTemplate, getAllTemplates, TEMPLATES } from "./templates";
import { AutomationEngine, executeTemplateAutomation, executeTemplateFlow, AutomationContext } from "./automation-engine";
import { getDb } from "./db";
import { customers, conversations, conversationMessages } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import appConfig from "./config/app-config.json";

export async function getTemplates(req: Request, res: Response) {
  try {
    const templates = getAllTemplates();
    res.json({
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        features: t.features,
        automationsCount: t.automations.length,
        flowsCount: t.defaultFlows.length
      }))
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'templates' });
    res.status(500).json({ error: "Failed to get templates" });
  }
}

export async function getTemplateConfig(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const template = getTemplate(type as any);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'template_config' });
    res.status(500).json({ error: "Failed to get template config" });
  }
}

export async function selectTemplate(req: Request, res: Response) {
  try {
    const { type } = req.body;
    const template = getTemplate(type as any);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    logger.info({ type: 'template_select', template: type });

    res.json({
      success: true,
      message: `Template ${template.name} selecionado com sucesso!`,
      template: {
        id: template.id,
        name: template.name,
        features: template.features,
        defaultFlows: template.defaultFlows.map(f => ({ id: f.id, name: f.name })),
        automations: template.automations.map(a => ({ id: a.id, name: a.name, enabled: a.enabled }))
      }
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'template_select' });
    res.status(500).json({ error: "Failed to select template" });
  }
}

export async function executeAutomation(req: Request, res: Response) {
  try {
    const { templateType, automationId, context } = req.body;

    const result = await executeTemplateAutomation(templateType, automationId, context || {});

    res.json({
      success: result.success,
      actionsExecuted: result.actionsExecuted,
      errors: result.errors
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'execute_automation' });
    res.status(500).json({ error: "Failed to execute automation" });
  }
}

export async function executeFlow(req: Request, res: Response) {
  try {
    const { templateType, flowId, context, initialData } = req.body;

    const result = await executeTemplateFlow(templateType, flowId, context || {}, initialData || {});

    res.json({
      success: result.success,
      stepsExecuted: result.stepsExecuted,
      currentStep: result.currentStep,
      data: result.data,
      errors: result.errors
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'execute_flow' });
    res.status(500).json({ error: "Failed to execute flow" });
  }
}

export async function processMessage(req: Request, res: Response) {
  try {
    const { templateType, customerId, message, channel = 'whatsapp' } = req.body;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    let conversationId: number | undefined;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    const template = getTemplate(templateType as any);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const context: AutomationContext = {
      customerId,
      channel,
      sentiment: await analyzeSentiment(message),
      metadata: { message, timestamp: Date.now() }
    };

    if (customer) {
      context.data = {
        name: customer.name,
        phone: customer.phone,
        tags: customer.tags ? JSON.parse(customer.tags as string) : []
      };
    }

    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.customerId, customerId),
        eq(conversations.status, 'open')
      ))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(1);

    if (existingConversation) {
      conversationId = existingConversation.id;
      context.conversationId = conversationId;

      await db.insert(conversationMessages).values({
        conversationId,
        senderId: null,
        senderType: 'customer',
        content: message,
        createdAt: new Date()
      });

      await db
        .update(conversations)
        .set({ lastMessageAt: new Date(), unreadCount: 1 })
        .where(eq(conversations.id, conversationId));
    }

    const engine = new AutomationEngine(templateType as any, context);
    const intent = await engine.executeAI({ action: 'classify_intent' });

    let aiResponse = '';
    const aiResult = await engine.executeAI({ action: 'generate_response' });
    aiResponse = aiResult.response || getDefaultResponse(template.id, intent.intent);

    if (conversationId) {
      await db.insert(conversationMessages).values({
        conversationId,
        senderId: null,
        senderType: 'customer',
        content: message,
        createdAt: new Date()
      });

      await db.insert(conversationMessages).values({
        conversationId,
        senderId: 1,
        senderType: 'agent',
        content: aiResponse,
        createdAt: new Date()
      });

      sseManager.emitToUser(String(customerId), {
        type: EVENTS.MESSAGE_NEW,
        data: { conversationId, content: aiResponse, senderType: 'ai' },
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      response: aiResponse,
      intent: intent.intent,
      sentiment: context.sentiment,
      suggestedActions: getSuggestedActions(template.id, intent.intent)
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'process_message' });
    res.status(500).json({ error: "Failed to process message" });
  }
}

async function analyzeSentiment(message: string): Promise<'positive' | 'neutral' | 'negative'> {
  const negativeWords = ['problema', 'reclamação', 'ruim', 'não funciona', 'odio', 'terrible', 'péssimo'];
  const positiveWords = ['obrigado', 'ótimo', 'excelente', 'perfeito', 'amo', 'fantástico'];

  const lower = message.toLowerCase();

  if (negativeWords.some(w => lower.includes(w))) return 'negative';
  if (positiveWords.some(w => lower.includes(w))) return 'positive';
  return 'neutral';
}

function getDefaultResponse(templateId: string, intent: string): string {
  const responses: Record<string, Record<string, string>> = {
    premium: {
      produto: 'Claro! Posso ajudá-lo a encontrar os melhores produtos. O que você está buscando?',
      duvida: 'Ficarei feliz em esclarecer suas dúvidas. O que gostaria de saber?',
      problema: 'Lamento pelo inconveniente. Vou transferência para um atendente VIP.',
      default: 'Em que posso ajudá-lo hoje?'
    },
    sales: {
      produto: 'Ótimo! Temos excelentes ofertas. O que procura?',
      duvida: 'Deixe-me ajudar com essa informação!',
      problema: 'Vamos resolver isso juntos!',
      default: 'Olá! Bem-vindo à Farmácia Francis. Como posso ajudá-lo?'
    },
    pharma: {
      produto: 'Posso ajudá-lo com informações sobre medicamentos.',
      duvida: 'Claro! Estou aqui para tirar suas dúvidas farmacêuticas.',
      problema: 'Vou verificar isso para você.',
      default: 'Olá! Sou a Fran, assistente farmacêutica. Em que posso ajudar?'
    },
    scheduling: {
      produto: 'Posso ajudá-lo a encontrar produtos e agendar consultas.',
      duvida: 'Claro! Em que posso ajudar com agendamentos?',
      problema: 'Vamos resolver isso juntos!',
      default: 'Olá! Bem-vindo ao agendamento da Farmácia Francis.'
    }
  };

  return responses[templateId]?.[intent] || responses[templateId]?.default || '';
}

function getSuggestedActions(templateId: string, intent: string): string[] {
  const actions: Record<string, Record<string, string[]>> = {
    premium: {
      produto: ['Ver catálogo', 'Ver ofertas', 'Falar com atendente'],
      duvida: ['Ver FAQ', 'Falar com farmacêutico'],
      default: ['Ver produtos', 'Agendar consulta', 'Falar com atendente']
    },
    sales: {
      produto: ['Ver ofertas', 'Comprar agora', 'Ver carrinho'],
      duvida: ['Ver catálogo', 'Ver preços'],
      default: ['Buscar produto', 'Ver ofertas', 'Falar com vendedor']
    },
    pharma: {
      produto: ['Ver informações', 'Ver bula'],
      duvida: ['Consultar farmacêutico', 'Ver alertas'],
      default: ['Consultar medicamento', 'Agendar', 'Falar com farmacêutico']
    },
    scheduling: {
      produto: ['Ver disponibilidade', 'Agendar'],
      duvida: ['Ver horários', 'Agendar consulta'],
      default: ['Agendar', 'Meus agendamentos', 'Cancelar']
    }
  };

  return actions[templateId]?.[intent] || actions[templateId]?.default || [];
}

export async function getURAContent(req: Request, res: Response) {
  try {
    const { templateType } = req.params;
    const template = getTemplate(templateType as any);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({
      success: true,
      ura: template.ura
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'ura_content' });
    res.status(500).json({ error: "Failed to get URA content" });
  }
}

export async function applyTemplate(req: Request, res: Response) {
  try {
    const { templateType, settings } = req.body;
    const template = getTemplate(templateType as any);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    logger.info({ type: 'apply_template', template: templateType, settings });

    res.json({
      success: true,
      message: `Template ${template.name} aplicado com sucesso!`,
      appliedFeatures: template.features,
      automationsEnabled: template.automations.filter(a => a.enabled).length,
      flowsConfigured: template.defaultFlows.length,
      uraConfigured: template.ura.id
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'apply_template' });
    res.status(500).json({ error: "Failed to apply template" });
  }
}

export async function getAnalytics(req: Request, res: Response) {
  try {
    const { templateType } = req.params;
    const template = getTemplate(templateType as any);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({
      success: true,
      analytics: {
        template: template.name,
        features: template.features,
        automations: template.automations.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          enabled: a.enabled
        })),
        flows: template.defaultFlows.map(f => ({
          id: f.id,
          name: f.name,
          steps: f.steps.length
        })),
        ura: {
          id: template.ura.id,
          name: template.ura.name,
          aiEnabled: template.ura.aiEnabled,
          optionsCount: template.ura.options.length
        }
      }
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'analytics' });
    res.status(500).json({ error: "Failed to get analytics" });
  }
}

export async function getConfig(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      config: appConfig
    });
  } catch (error) {
    logger.error({ err: error as Error, type: 'config' });
    res.status(500).json({ error: "Failed to get config" });
  }
}

export default {
  getTemplates,
  getTemplateConfig,
  selectTemplate,
  executeAutomation,
  executeFlow,
  processMessage,
  getURAContent,
  applyTemplate,
  getAnalytics,
  getConfig
};

export const templatesRouter = {
  getTemplates,
  getTemplateConfig,
  selectTemplate,
  executeAutomation,
  executeFlow,
  processMessage,
  getURAContent,
  applyTemplate,
  getAnalytics,
  getConfig
};