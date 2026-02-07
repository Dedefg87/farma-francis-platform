import { Request, Response } from "express";
import { createContext } from "./context";
import { logger } from "./_core/logger";
import { sseManager, EVENTS } from "./_core/sse";
import { 
  AI_CONVERSATION_TEMPLATES, 
  AI_NODE_TYPES, 
  AI_KNOWLEDGE_BASES, 
  AI_DEFAULT_PROMPT, 
  AI_ERROR_HANDLING, 
  AI_CONTEXT_MANAGEMENT, 
  AI_INTEGRATION_CONFIG 
} from "./ai-templates";

/**
 * Process AI conversation flow
 */
export async function processAIConversation(req: Request, res: Response) {
  try {
    const { 
      templateId, 
      customerId, 
      channelId, 
      message, 
      context 
    } = req.body;

    if (!templateId || !customerId || !channelId || !message) {
      return res.status(400).json({ 
        error: "Missing required parameters", 
        required: ["templateId", "customerId", "channelId", "message"] 
      });
    }

    // Get template
    const template = AI_CONVERSATION_TEMPLATES[templateId];
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Initialize context
    const conversationContext = initializeContext(customerId, channelId, context);

    // Process flow
    const result = await processFlow(template, message, conversationContext);

    // Save conversation history
    await saveConversationHistory(customerId, channelId, result);

    // Emit SSE events
    emitSSEEvents(customerId, result);

    res.json({
      success: true,
      result,
      context: conversationContext
    });

  } catch (error) {
    logger.error(error as Error, { context: req.body });
    res.status(500).json({ 
      error: "Internal server error", 
      message: (error as Error).message 
    });
  }
}

/**
 * Process automation flow
 */
export async function processAutomationFlow(req: Request, res: Response) {
  try {
    const { 
      flowId, 
      triggerType, 
      triggerData, 
      customerId 
    } = req.body;

    if (!flowId || !triggerType) {
      return res.status(400).json({ 
        error: "Missing required parameters", 
        required: ["flowId", "triggerType"] 
      });
    }

    // Get flow
    const flow = await getVisualFlow(flowId);
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }

    // Process flow
    const result = await executeFlow(flow, triggerType, triggerData, customerId);

    res.json({
      success: true,
      result,
      executionId: result.executionId
    });

  } catch (error) {
    logger.error(error as Error, { context: req.body });
    res.status(500).json({ 
      error: "Internal server error", 
      message: (error as Error).message 
    });
  }
}

/**
 * Get AI templates
 */
export async function getAITemplates(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      templates: AI_CONVERSATION_TEMPLATES,
      nodeTypes: AI_NODE_TYPES,
      knowledgeBases: AI_KNOWLEDGE_BASES,
      defaultPrompt: AI_DEFAULT_PROMPT,
      errorHandling: AI_ERROR_HANDLING,
      contextManagement: AI_CONTEXT_MANAGEMENT,
      integrationConfig: AI_INTEGRATION_CONFIG
    });
  } catch (error) {
    logger.error(error as Error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Initialize conversation context
 */
function initializeContext(customerId: number, channelId: string, existingContext?: any) {
  const context = existingContext || {};
  
  return {
    ...context,
    customerId,
    channelId,
    conversationId: `${channelId}-${Date.now()}`,
    startTime: new Date().toISOString(),
    turnCount: context.turnCount || 0,
    memory: context.memory || [],
    preferences: context.preferences || {
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      notification: true
    }
  };
}

/**
 * Process flow execution
 */
async function processFlow(template: any, message: string, context: any) {
  const result = {
    conversationId: context.conversationId,
    customerId: context.customerId,
    channelId: context.channelId,
    messages: [],
    decisions: [],
    actions: [],
    finalResponse: "",
    needsHuman: false,
    contextUpdate: {}
  };

  // Process each node in the flow
  for (const node of template.nodes) {
    const nodeResult = await processNode(node, message, context, result);
    
    // Add to result
    if (nodeResult.message) {
      result.messages.push(nodeResult.message);
    }
    if (nodeResult.decision) {
      result.decisions.push(nodeResult.decision);
    }
    if (nodeResult.action) {
      result.actions.push(nodeResult.action);
    }
    
    // Update context
    context.turnCount = (context.turnCount || 0) + 1;
    
    // Check for end conditions
    if (node.type === "end" || nodeResult.shouldEnd) {
      break;
    }
  }

  // Generate final response
  result.finalResponse = generateFinalResponse(result, context);

  return result;
}

/**
 * Process individual node
 */
async function processNode(node: any, message: string, context: any, result: any) {
  switch (node.type) {
    case "trigger":
      return await processTriggerNode(node, message, context);
    
    case "message":
      return await processMessageNode(node, context);
    
    case "ai-classify":
      return await processAICLassifyNode(node, message, context);
    
    case "condition":
      return await processConditionNode(node, result, context);
    
    case "ai-response":
      return await processAIResponseNode(node, message, context);
    
    case "ai-recommendation":
      return await processAIRecommendationNode(node, message, context);
    
    case "ai-extract":
      return await processAIExtractNode(node, message, context);
    
    case "ai-select":
      return await processAISelectNode(node, result, context);
    
    case "ai-format":
      return await processAIFormatNode(node, result, context);
    
    case "ai-confirm":
      return await processAIConfirmNode(node, message, context);
    
    case "ai-checkout":
      return await processAICheckoutNode(node, message, context);
    
    case "knowledge-search":
      return await processKnowledgeSearchNode(node, message, context);
    
    case "api-call":
      return await processAPICallNode(node, context);
    
    case "schedule":
      return await processScheduleNode(node, context);
    
    case "transfer":
      return await processTransferNode(node, context);
    
    case "end":
      return await processEndNode(node, context);
    
    default:
      return { message: `Unknown node type: ${node.type}` };
  }
}

/**
 * Process trigger node
 */
async function processTriggerNode(node: any, message: string, context: any) {
  const keywords = node.config.keywords;
  const channels = node.config.channels;
  
  // Check if message contains trigger keywords
  const messageLower = message.toLowerCase();
  const matchedKeyword = keywords.find(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );
  
  return {
    message: matchedKeyword 
      ? `Trigger detected: "${matchedKeyword}"` 
      : "No trigger keyword matched",
    decision: {
      type: "trigger",
      matched: !!matchedKeyword,
      keyword: matchedKeyword
    }
  };
}

/**
 * Process message node
 */
async function processMessageNode(node: any, context: any) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      delay: node.config.delay || 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Process AI classify node
 */
async function processAICLassifyNode(node: any, message: string, context: any) {
  try {
    const response = await callAIProvider({
      model: node.config.model,
      prompt: node.config.prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens
    });

    const classification = response.choices[0].message.content.trim();
    
    return {
      message: `Classificação: ${classification}`,
      decision: {
        type: "classification",
        category: classification,
        confidence: response.choices[0].index || 0.8
      },
      action: {
        type: "update-context",
        field: "classification",
        value: classification
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI classification failed"
      }
    };
  }
}

/**
 * Process condition node
 */
async function processConditionNode(node: any, result: any, context: any) {
  const conditions = node.config.conditions;
  let shouldFollowTruePath = true;

  for (const condition of conditions) {
    const nodeValue = result[condition.node]?.[condition.field];
    
    switch (condition.operator) {
      case "equals":
        if (nodeValue !== condition.value) {
          shouldFollowTruePath = false;
        }
        break;
      case "contains":
        if (!nodeValue?.includes(condition.value)) {
          shouldFollowTruePath = false;
        }
        break;
      case "greaterThan":
        if (nodeValue < condition.value) {
          shouldFollowTruePath = false;
        }
        break;
      case "lessThan":
        if (nodeValue > condition.value) {
          shouldFollowTruePath = false;
        }
        break;
    }
  }

  return {
    decision: {
      type: "condition",
      condition: node.config.conditions,
      result: shouldFollowTruePath
    },
    action: {
      type: "route",
      path: shouldFollowTruePath ? node.config.truePath : node.config.falsePath
    }
  };
}

/**
 * Process AI response node
 */
async function processAIResponseNode(node: any, message: string, context: any) {
  try {
    const prompt = `
${AI_DEFAULT_PROMPT}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message}

## Responda com base neste contexto e nas instruções específicas:
${node.config.prompt}
`;

    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens,
      temperature: node.config.temperature || 0.3
    });

    const aiResponse = response.choices[0].message.content.trim();
    
    return {
      message: {
        type: "bot",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        aiModel: node.config.model,
        knowledgeBase: node.config.knowledgeBase
      },
      action: {
        type: "response",
        content: aiResponse,
        model: node.config.model
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: "AI response failed"
      }
    };
  }
}

/**
 * Process AI recommendation node
 */
async function processAIRecommendationNode(node: any, message: string, context: any) {
  try {
    const prompt = `
${AI_DEFAULT_PROMPT}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message}
- Necessidades identificadas: [INSERIR NECESSIDADES]

## Recomende produtos farmacêuticos baseado nas necessidades do cliente:
${node.config.prompt}
`;

    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens
    });

    const recommendations = parseRecommendations(response.choices[0].message.content);
    
    return {
      message: {
        type: "bot",
        content: generateRecommendationsMessage(recommendations),
        timestamp: new Date().toISOString(),
        recommendations
      },
      action: {
        type: "recommendations",
        products: recommendations,
        model: node.config.model
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[2],
      decision: {
        type: "error",
        error: "AI recommendation failed"
      }
    };
  }
}

/**
 * Process AI extract node
 */
async function processAIExtractNode(node: any, message: string, context: any) {
  try {
    const response = await callAIProvider({
      model: node.config.model,
      prompt: node.config.prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens
    });

    const extractedData = response.choices[0].message.content.trim();
    
    return {
      message: `Informações extraídas: ${extractedData}`,
      decision: {
        type: "extraction",
        data: extractedData
      },
      action: {
        type: "update-context",
        field: "extractedData",
        value: extractedData
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI extraction failed"
      }
    };
  }
}

/**
 * Process AI select node
 */
async function processAISelectNode(node: any, result: any, context: any) {
  try {
    const options = result[Object.keys(result).find(key => key.includes("options"))] || [];
    
    if (options.length === 0) {
      return {
        message: "Nenhuma opção disponível para seleção",
        decision: {
          type: "selection",
          result: null
        }
      };
    }

    const response = await callAIProvider({
      model: node.config.model,
      prompt: `
${node.config.prompt}

## Opções disponíveis:
${options.map((opt: any, i: number) => `${i + 1}. ${JSON.stringify(opt)}`).join("\n")}
`,
      maxTokens: node.config.maxTokens
    });

    const selectedIndex = parseInt(response.choices[0].message.content.trim()) - 1;
    const selectedOption = options[selectedIndex];
    
    return {
      message: `Opção selecionada: ${JSON.stringify(selectedOption)}`,
      decision: {
        type: "selection",
        selected: selectedOption,
        index: selectedIndex
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI selection failed"
      }
    };
  }
}

/**
 * Process AI format node
 */
async function processAIFormatNode(node: any, result: any, context: any) {
  try {
    const dataToFormat = result[Object.keys(result).find(key => key.includes("data"))] || {};
    
    const response = await callAIProvider({
      model: node.config.model,
      prompt: `
${node.config.prompt}

## Dados a serem formatados:
${JSON.stringify(dataToFormat, null, 2)}
`,
      maxTokens: node.config.maxTokens
    });

    const formattedData = response.choices[0].message.content.trim();
    
    return {
      message: `Dados formatados:\n${formattedData}`,
      decision: {
        type: "formatting",
        formatted: formattedData
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI formatting failed"
      }
    };
  }
}

/**
 * Process AI confirm node
 */
async function processAIConfirmNode(node: any, message: string, context: any) {
  try {
    const prompt = `
${node.config.prompt}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message}
`;

    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens
    });

    const confirmation = response.choices[0].message.content.trim().toLowerCase();
    const isConfirmed = confirmation.includes("sim") || confirmation.includes("confirmo");
    
    return {
      message: isConfirmed ? "Confirmação recebida" : "Confirmação não recebida",
      decision: {
        type: "confirmation",
        confirmed: isConfirmed,
        response: confirmation
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI confirmation failed"
      }
    };
  }
}

/**
 * Process AI checkout node
 */
async function processAICheckoutNode(node: any, message: string, context: any) {
  try {
    const prompt = `
${node.config.prompt}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message}
- Formas de pagamento disponíveis: ${node.config.paymentMethods.join(", ")}
- Opções de entrega: ${node.config.deliveryOptions.join(", ")}
`;

    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message }],
      maxTokens: node.config.maxTokens
    });

    const checkoutData = parseCheckoutData(response.choices[0].message.content);
    
    return {
      message: {
        type: "bot",
        content: generateCheckoutMessage(checkoutData),
        timestamp: new Date().toISOString(),
        checkoutData
      },
      action: {
        type: "checkout",
        data: checkoutData,
        model: node.config.model
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: "AI checkout failed"
      }
    };
  }
}

/**
 * Process knowledge search node
 */
async function processKnowledgeSearchNode(node: any, message: string, context: any) {
  try {
    const knowledgeBase = AI_KNOWLEDGE_BASES[node.config.knowledgeBase];
    if (!knowledgeBase) {
      throw new Error(`Knowledge base ${node.config.knowledgeBase} not found`);
    }

    const results = await searchKnowledgeBase(knowledgeBase, message, node.config.searchType);
    
    return {
      message: `Resultados encontrados: ${results.length} itens`,
      decision: {
        type: "knowledge-search",
        results: results.slice(0, node.config.maxResults)
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "Knowledge search failed"
      }
    };
  }
}

/**
 * Process API call node
 */
async function processAPICallNode(node: any, context: any) {
  try {
    const response = await fetch(node.config.endpoint, {
      method: node.config.method,
      headers: {
        'Content-Type': 'application/json',
        ...node.config.headers
      },
      body: node.config.body ? JSON.stringify(node.config.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      message: `API call successful: ${JSON.stringify(data, null, 2)}`,
      decision: {
        type: "api-call",
        endpoint: node.config.endpoint,
        method: node.config.method,
        response: data
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: `API call failed: ${(error as Error).message}`
      }
    };
  }
}

/**
 * Process schedule node
 */
async function processScheduleNode(node: any, context: any) {
  // Schedule the task (implementation depends on scheduler)
  return {
    message: `Tarefa agendada: ${node.config.scheduleType}`,
    decision: {
      type: "schedule",
      scheduleType: node.config.scheduleType,
      cronExpression: node.config.cronExpression,
      interval: node.config.interval
    }
  };
}

/**
 * Process transfer node
 */
async function processTransferNode(node: any, context: any) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      timestamp: new Date().toISOString(),
      transfer: {
        to: "human",
        channels: node.config.channels,
        priority: node.config.priority || "medium"
      }
    },
    decision: {
      type: "transfer",
      to: "human",
      channels: node.config.channels,
      priority: node.config.priority || "medium"
    },
    action: {
      type: "transfer",
      to: "human",
      channels: node.config.channels,
      priority: node.config.priority || "medium"
    }
  };
}

/**
 * Process end node
 */
async function processEndNode(node: any, context: any) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      timestamp: new Date().toISOString(),
      end: true
    },
    decision: {
      type: "end",
      saveContext: node.config.saveContext || false,
      followUp: node.config.followUp || false
    },
    shouldEnd: true
  };
}

/**
 * Generate final response
 */
function generateFinalResponse(result: any, context: any) {
  if (result.finalResponse) {
    return result.finalResponse;
  }

  if (result.messages.length > 0) {
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage.type === "bot") {
      return lastMessage.content;
    }
  }

  return "Obrigado por entrar em contato! Estamos aqui para ajudar.";
}

/**
 * Call AI provider
 */
async function callAIProvider(options: {
  model: string;
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const provider = AI_INTEGRATION_CONFIG.providers.openai;
  
  const response = await fetch(`${provider.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages || [
        { role: "system", content: options.prompt },
        { role: "user", content: options.prompt }
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`AI API call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Parse recommendations
 */
function parseRecommendations(text: string) {
  // Simple parsing logic - in production, use structured output
  const products = [];
  
  // Extract product information from text
  const lines = text.split('\n');
  lines.forEach(line => {
    if (line.includes('Produto:')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        products.push({
          name: parts[1].trim(),
          description: parts[2]?.trim() || '',
          price: parts[3]?.trim() || '',
          image: parts[4]?.trim() || ''
        });
      }
    }
  });
  
  return products;
}

/**
 * Generate recommendations message
 */
function generateRecommendationsMessage(products: any[]) {
  return `Encontrei estes produtos para você:\n\n` +
    products.map((p: any, i: number) => 
      `${i + 1}. ${p.name}\n   ${p.description}\n   Preço: ${p.price}\n\n`
    ).join('') +
    `Deseja mais informações sobre algum deles?`;
}

/**
 * Parse checkout data
 */
function parseCheckoutData(text: string) {
  const data = {};
  
  // Simple parsing logic
  if (text.includes('Pagamento:')) {
    data.paymentMethod = text.split('Pagamento:')[1].split('\n')[0].trim();
  }
  if (text.includes('Entrega:')) {
    data.deliveryOption = text.split('Entrega:')[1].split('\n')[0].trim();
  }
  if (text.includes('Total:')) {
    data.total = text.split('Total:')[1].split('\n')[0].trim();
  }
  
  return data;
}

/**
 * Generate checkout message
 */
function generateCheckoutMessage(data: any) {
  return `Ótimo! Vou processar seu pedido:\n\n` +
    `Pagamento: ${data.paymentMethod}\n` +
    `Entrega: ${data.deliveryOption}\n` +
    `Total: ${data.total}\n\n` +
    `Por favor, confirme se está tudo correto.`;
}

/**
 * Search knowledge base
 */
async function searchKnowledgeBase(knowledgeBase: any, query: string, searchType: string) {
  if (searchType === 'semantic') {
    // Implement semantic search using embeddings
    return semanticSearch(knowledgeBase.content, query);
  } else {
    // Simple keyword search
    return keywordSearch(knowledgeBase.content, query);
  }
}

/**
 * Semantic search
 */
async function semanticSearch(content: string, query: string) {
  // Implement semantic search using embeddings
  // This would use the embeddings model configured in AI_INTEGRATION_CONFIG
  return [{ content: content, score: 0.9 }]; // Mock response
}

/**
 * Keyword search
 */
function keywordSearch(content: string, query: string) {
  const results = [];
  const queryLower = query.toLowerCase();
  
  if (content.toLowerCase().includes(queryLower)) {
    results.push({ content, score: 1.0 });
  }
  
  return results;
}

/**
 * Save conversation history
 */
async function saveConversationHistory(customerId: number, channelId: string, result: any) {
  // Save to database
  // Implementation depends on your database schema
  console.log('Saving conversation history:', {
    customerId,
    channelId,
    result
  });
}

/**
 * Emit SSE events
 */
function emitSSEEvents(customerId: number, result: any) {
  const events = [];
  
  // Emit message events
  result.messages.forEach((message: any) => {
    events.push({
      type: EVENTS.MESSAGE_NEW,
      data: {
        customerId,
        channelId: result.channelId,
        message
      }
    });
  });
  
  // Emit status events
  if (result.needsHuman) {
    events.push({
      type: EVENTS.AGENT_STATUS,
      data: {
        customerId,
        status: 'needs-human'
      }
    });
  }
  
  // Emit to SSE manager
  events.forEach(event => {
    sseManager.emitToUser(String(customerId), {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    });
  });
}

/**
 * Get visual flow
 */
async function getVisualFlow(flowId: string) {
  // Implementation to get flow from database
  return {
    id: flowId,
    name: "Flow Name",
    flowData: "{\"nodes\": [], \"edges\": []}",
    isActive: true
  };
}

/**
 * Execute visual flow
 */
async function executeFlow(flow: any, triggerType: string, triggerData: any, customerId: number) {
  // Implementation to execute visual flow
  return {
    executionId: `${flow.id}-${Date.now()}`,
    status: "completed",
    result: "Flow executed successfully",
    executionTime: 1234
  };
}

export default {
  processAIConversation,
  processAutomationFlow,
  getAITemplates
};