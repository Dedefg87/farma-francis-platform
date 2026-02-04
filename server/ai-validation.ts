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
