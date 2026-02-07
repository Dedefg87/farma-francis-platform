/**
 * AI Token Validation Module
 * 
 * Validates API tokens for different AI providers by making real API calls
 */

type AIProvider = "openai" | "anthropic" | "google" | "meta";

interface ValidationResult {
  success: boolean;
  message: string;
  modelInfo?: {
    name: string;
    version: string;
  };
}

/**
 * Validate OpenAI API Key
 * Makes a minimal API call to verify the token
 */
async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Invalid API key" } }));
      return {
        success: false,
        message: error.error?.message || "Falha na autenticação com OpenAI",
      };
    }

    const data = await response.json();
    const gpt4Model = data.data?.find((m: any) => m.id.includes("gpt-4"));

    return {
      success: true,
      message: "Token OpenAI válido! Acesso confirmado.",
      modelInfo: gpt4Model ? {
        name: gpt4Model.id,
        version: "GPT-4",
      } : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao validar OpenAI: ${error.message}`,
    };
  }
}

/**
 * Validate Anthropic Claude API Key
 * Makes a minimal API call to verify the token
 */
async function validateAnthropic(apiKey: string): Promise<ValidationResult> {
  try {
    // Anthropic doesn't have a models endpoint, so we make a minimal completion request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Invalid API key" } }));
      return {
        success: false,
        message: error.error?.message || "Falha na autenticação com Anthropic",
      };
    }

    return {
      success: true,
      message: "Token Anthropic válido! Acesso ao Claude confirmado.",
      modelInfo: {
        name: "claude-3-5-sonnet",
        version: "Claude 3.5 Sonnet",
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao validar Anthropic: ${error.message}`,
    };
  }
}

/**
 * Validate Google Gemini API Key
 * Makes a minimal API call to verify the token
 */
async function validateGoogle(apiKey: string): Promise<ValidationResult> {
  try {
    // Google Gemini uses API key as query parameter
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Invalid API key" } }));
      return {
        success: false,
        message: error.error?.message || "Falha na autenticação com Google",
      };
    }

    const data = await response.json();
    const geminiModel = data.models?.find((m: any) => m.name.includes("gemini-1.5-pro"));

    return {
      success: true,
      message: "Token Google válido! Acesso ao Gemini confirmado.",
      modelInfo: geminiModel ? {
        name: geminiModel.name,
        version: "Gemini 1.5 Pro",
      } : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao validar Google: ${error.message}`,
    };
  }
}

/**
 * Validate Meta Llama API Key
 * Note: Meta's Llama models are typically accessed through third-party providers
 * This is a placeholder for future implementation
 */
async function validateMeta(apiKey: string): Promise<ValidationResult> {
  // Meta's Llama models are open-source and typically accessed through
  // providers like Replicate, Together AI, or self-hosted
  // For now, we'll return a placeholder response
  return {
    success: false,
    message: "Validação de tokens Meta Llama ainda não implementada. Use um provedor como Replicate ou Together AI.",
  };
}

/**
 * Main validation function that routes to the correct provider
 */
export async function validateAIToken(
  provider: AIProvider,
  apiKey: string
): Promise<ValidationResult> {
  // Validate input
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      message: "API Key não pode estar vazia",
    };
  }

  // Route to correct validation function
  switch (provider) {
    case "openai":
      return await validateOpenAI(apiKey);
    case "anthropic":
      return await validateAnthropic(apiKey);
    case "google":
      return await validateGoogle(apiKey);
    case "meta":
      return await validateMeta(apiKey);
    default:
      return {
        success: false,
        message: `Provedor desconhecido: ${provider}`,
      };
  }
}

interface TestAgentInput {
  provider: AIProvider;
  apiKey: string;
  model: string;
  prompt: string;
  testMessage: string;
  maxTokens?: number;
  temperature?: number;
}

interface TestAgentResult {
  success: boolean;
  response?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Test AI Agent with real API call
 * Sends a test message to the configured model and returns the response
 */
export async function testAIAgent(input: TestAgentInput): Promise<TestAgentResult> {
  const { provider, apiKey, model, prompt, testMessage, maxTokens = 500, temperature = 0.7 } = input;

  try {
    switch (provider) {
      case "openai":
        return await testOpenAI(apiKey, model, prompt, testMessage, maxTokens, temperature);
      case "anthropic":
        return await testAnthropic(apiKey, model, prompt, testMessage, maxTokens, temperature);
      case "google":
        return await testGoogle(apiKey, model, prompt, testMessage, maxTokens, temperature);
      case "meta":
        return {
          success: false,
          error: "Teste de agentes Meta Llama ainda não implementado",
        };
      default:
        return {
          success: false,
          error: `Provedor desconhecido: ${provider}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Erro ao testar agente: ${error.message}`,
    };
  }
}

async function testOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<TestAgentResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    return {
      success: false,
      error: error.error?.message || "Falha ao chamar OpenAI API",
    };
  }

  const data = await response.json();
  return {
    success: true,
    response: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function testAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<TestAgentResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    return {
      success: false,
      error: error.error?.message || "Falha ao chamar Anthropic API",
    };
  }

  const data = await response.json();
  return {
    success: true,
    response: data.content[0]?.text || "",
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

async function testGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<TestAgentResult> {
  // Extract model ID from full model name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
  const modelId = model.includes("/") ? model.split("/").pop() : model;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nUser: ${userMessage}` },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    return {
      success: false,
      error: error.error?.message || "Falha ao chamar Google Gemini API",
    };
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  return {
    success: true,
    response: responseText,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  };
}

import { logger } from "./logger";

const AI_CONTEXT_MANAGEMENT = {
  conversationMemory: {
    maxTurns: 20,
    ttlMinutes: 30,
    keyFields: ["customerId", "channel", "phoneNumber"]
  },
  
  sessionContext: {
    customerInfo: {
      name: "",
      phone: "",
      history: []
    },
    currentFlow: {
      name: "",
      step: 0,
      data: {}
    },
    preferences: {
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      notification: true
    }
  }
};

const AI_ERROR_HANDLING = {
  fallbackMessages: [
    "Desculpe, não consegui entender sua pergunta. Poderia reformular?",
    "Parece que tuvimos um problema técnico. Deixe-me transferir para um atendente humano.",
    "Gostaria de falar com um de nossos atendentes? Eles podem ajudar melhor com sua solicitação."
  ],
  
  validationRules: {
    maxLength: 2000,
    prohibitedContent: ["conteúdo explícito", "discurso de ódio", "informações falsas"],
    medicalRestrictions: ["prescrever medicamentos", "diagnosticar doenças", "dar conselhos médicos"]
  }
};

const AI_INTEGRATION_CONFIG = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: "gpt-3.5-turbo",
      baseURL: "https://api.openai.com/v1"
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "claude-3-sonnet-20240229",
      baseURL: "https://api.anthropic.com/v1"
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY || "",
      model: "gemini-pro",
      baseURL: "https://generativelanguage.googleapis.com/v1"
    }
  },
  
  embeddings: {
    model: "text-embedding-ada-002",
    dimensions: 1536,
    similarityThreshold: 0.7
  },
  
  rateLimits: {
    messagesPerMinute: 60,
    messagesPerHour: 1000,
    concurrentRequests: 5
  }
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent?: string;
}

interface FallbackResult {
  usedFallback: boolean;
  fallbackType: 'human' | 'retry' | 'default' | 'cached';
  response: string;
  confidence: number;
}

class AIValidator {
  private prohibitedPatterns = [
    /prescrever|receitar|indicar\s+medicamento/i,
    /diagnóstic|diagnosticar/i,
    /tratamento\s+para|cura\s+do/i,
    /tomar\s+\d+\s+comprimidos/i,
    /doses?\s+diárias?\s+de/i,
    /consulte\s+um\s+médico/i,
    /automédicação/i,
  ];

  private sensitivePatterns = [
    /cpf|cnpj|número\s+do\s+cartão/i,
    /senha|password/i,
    /dados\s+pessoais/i,
  ];

  private medicalDisclaimerPatterns = [
    /não\s+sou\s+um\s+médico/i,
    /consulte\s+um\s+profissional/i,
    /informação\s+generalizada/i,
  ];

  async validateResponse(content: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedContent = content;

    if (content.length > AI_ERROR_HANDLING.validationRules.maxLength) {
      errors.push(`Response too long: ${content.length} chars (max: ${AI_ERROR_HANDLING.validationRules.maxLength})`);
      sanitizedContent = sanitizedContent.substring(0, AI_ERROR_HANDLING.validationRules.maxLength);
    }

    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(content)) {
        errors.push(`Prohibited content detected: ${pattern.source}`);
        sanitizedContent = sanitizedContent.replace(pattern, '[INFORMAÇÃO REMOVIDA]');
      }
    }

    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(content)) {
        warnings.push(`Sensitive information detected: ${pattern.source}`);
        sanitizedContent = sanitizedContent.replace(pattern, '[DADOS SENSÍVEIS]');
      }
    }

    const hasDisclaimer = this.medicalDisclaimerPatterns.some(pattern => pattern.test(content));
    if (!hasDisclaimer && this.containsMedicalContent(content)) {
      warnings.push('Medical content without disclaimer');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent
    };
  }

  private containsMedicalContent(content: string): boolean {
    const medicalTerms = [
      'medicamento', 'remédio', 'dosagem', 'efeito', 'colateral',
      'tratamento', 'sintoma', 'doença', 'farmácia', 'droga'
    ];
    return medicalTerms.some(term => content.toLowerCase().includes(term));
  }

  validateConversationContext(context: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.customerId) {
      errors.push('Missing required field: customerId');
    }
    if (!context.channelId) {
      errors.push('Missing required field: channelId');
    }

    const memory = context.memory as Array<{ role: string; content: string }> | undefined;
    if (memory && memory.length > AI_CONTEXT_MANAGEMENT.conversationMemory.maxTurns) {
      warnings.push(`Conversation memory exceeds ${AI_CONTEXT_MANAGEMENT.conversationMemory.maxTurns} turns`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

class AIFallbackManager {
  private validator = new AIValidator();
  private retryCount = new Map<string, number>();
  private cache = new Map<string, { response: string; timestamp: number }>();

  async getFallback(
    originalResponse: string,
    context: {
      customerId: number;
      channelId: string;
      conversationId: string;
      intent?: string;
    },
    error?: Error
  ): Promise<FallbackResult> {
    const retryKey = `${context.customerId}-${context.conversationId}`;
    const currentRetry = this.retryCount.get(retryKey) || 0;

    if (currentRetry < AI_INTEGRATION_CONFIG.rateLimits.concurrentRequests) {
      const validation = await this.validator.validateResponse(originalResponse);
      
      if (validation.isValid) {
        this.retryCount.delete(retryKey);
        return {
          usedFallback: false,
          fallbackType: 'cached',
          response: validation.sanitizedContent || originalResponse,
          confidence: 0.9
        };
      }

      if (validation.sanitizedContent) {
        this.retryCount.set(retryKey, currentRetry + 1);
        return {
          usedFallback: true,
          fallbackType: 'retry',
          response: validation.sanitizedContent,
          confidence: 0.7
        };
      }
    }

    const defaultMessage = this.getDefaultFallbackMessage(context.intent);
    
    return {
      usedFallback: true,
      fallbackType: 'human',
      response: defaultMessage,
      confidence: 0.5
    };
  }

  private getDefaultFallbackMessage(intent?: string): string {
    const messages = AI_ERROR_HANDLING.fallbackMessages;
    
    switch (intent) {
      case 'products':
        return 'Desculpe, não consegui encontrar informações sobre os produtos. Um de nossos atendentes está disponível para ajudá-lo.';
      case 'scheduling':
        return 'Tivemos uma dificuldade para processar seu agendamento. Por favor, entre em contato diretamente ou aguarde um atendente.';
      case 'prices':
        return 'Não foi possível recuperar as informações de preço no momento. Nossa equipe entrará em contato em breve.';
      default:
        return messages[Math.floor(Math.random() * messages.length)];
    }
  }

  clearRetryCount(conversationId: string) {
    for (const [key] of this.retryCount) {
      if (key.includes(conversationId)) {
        this.retryCount.delete(key);
      }
    }
  }

  getCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.response;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key: string, response: string) {
    this.cache.set(key, { response, timestamp: Date.now() });
  }
}

class AIRateLimiter {
  private requestCount = new Map<string, { count: number; resetTime: number }>();

  async checkLimit(
    key: string,
    limits: {
      perMinute: number;
      perHour: number;
    } = AI_INTEGRATION_CONFIG.rateLimits
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const minuteReset = now + 60000;

    let record = this.requestCount.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: minuteReset };
    } else {
      record.count++;
    }

    this.requestCount.set(key, record);

    const remaining = Math.min(limits.perMinute - record.count, limits.perHour - record.count);

    return {
      allowed: record.count < limits.perMinute && record.count < limits.perHour,
      remaining: Math.max(0, remaining),
      resetTime: record.resetTime
    };
  }

  reset(key: string) {
    this.requestCount.delete(key);
  }
}

class AIConversationManager {
  private contextStore = new Map<string, {
    context: Record<string, unknown>;
    lastActivity: number;
  }>();

  private readonly CONTEXT_TTL = AI_CONTEXT_MANAGEMENT.conversationMemory.ttlMinutes * 60000;
  private readonly MAX_TURNS = AI_CONTEXT_MANAGEMENT.conversationMemory.maxTurns;

  async getContext(conversationId: string): Promise<Record<string, unknown> | null> {
    const record = this.contextStore.get(conversationId);
    
    if (!record) {
      return null;
    }

    if (Date.now() - record.lastActivity > this.CONTEXT_TTL) {
      this.contextStore.delete(conversationId);
      return null;
    }

    return record.context;
  }

  async updateContext(
    conversationId: string,
    update: {
      message?: { role: string; content: string };
      data?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let record = this.contextStore.get(conversationId);
    
    if (!record) {
      record = {
        context: {
          conversationId,
          startTime: new Date().toISOString(),
          memory: [],
          preferences: AI_CONTEXT_MANAGEMENT.sessionContext.preferences
        },
        lastActivity: Date.now()
      };
    }

    if (update.message) {
      const memory = record.context.memory as Array<{ role: string; content: string }>;
      memory.push(update.message);

      if (memory.length > this.MAX_TURNS) {
        memory.splice(0, memory.length - this.MAX_TURNS);
      }
    }

    if (update.data) {
      record.context = { ...record.context, ...update.data };
    }

    record.lastActivity = Date.now();
    this.contextStore.set(conversationId, record);

    return record.context;
  }

  async clearContext(conversationId: string): Promise<void> {
    this.contextStore.delete(conversationId);
    logger.info({ type: 'ai_context', conversationId, action: 'cleared' });
  }

  getActiveConversations(): string[] {
    const active: string[] = [];
    const now = Date.now();

    for (const [conversationId, record] of this.contextStore) {
      if (now - record.lastActivity < this.CONTEXT_TTL) {
        active.push(conversationId);
      }
    }

    return active;
  }
}

export const aiValidator = new AIValidator();
export const aiFallbackManager = new AIFallbackManager();
export const aiRateLimiter = new AIRateLimiter();
export const aiConversationManager = new AIConversationManager();
