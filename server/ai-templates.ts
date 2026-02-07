export const AI_CONVERSATION_TEMPLATES = {
  /**
   * Customer Service Template
   * For general customer inquiries and support
   */
  CUSTOMER_SERVICE: {
    name: "Atendimento ao Cliente",
    description: "Template para atendimento geral de clientes com IA",
    trigger: "atendimento, ajuda, suporte, informações",
    nodes: [
      {
        id: "start",
        type: "trigger",
        name: "Início",
        config: {
          triggerType: "keyword",
          keywords: ["atendimento", "ajuda", "suporte", "informações", "falar com"],
          channels: ["whatsapp", "instagram"]
        }
      },
      {
        id: "greet",
        type: "message",
        name: "Saudação",
        config: {
          message: "Olá! Seja bem-vindo(a) ao atendimento da Farmácia Francis. Como posso ajudar você hoje?",
          delay: 1000
        }
      },
      {
        id: "classify",
        type: "ai-classify",
        name: "Classificar Intenção",
        config: {
          model: "gpt-4",
          prompt: "Classifique a intenção do cliente em uma das categorias: produtos, preços, horários, entrega, devolução, outros",
          maxTokens: 100
        }
      },
      {
        id: "route",
        type: "condition",
        name: "Roteamento",
        config: {
          conditions: [
            {
              node: "classify",
              field: "category",
              operator: "equals",
              value: "produtos"
            }
          ],
          truePath: "products",
          falsePath: "other"
        }
      },
      {
        id: "products",
        type: "ai-response",
        name: "Informações de Produtos",
        config: {
          model: "gpt-3.5-turbo",
          knowledgeBase: "produtos_farmacia",
          prompt: "Forneça informações sobre produtos farmacêuticos. Seja específico sobre preços, disponibilidade e indicações.",
          maxTokens: 300,
          temperature: 0.3
        }
      },
      {
        id: "other",
        type: "ai-response",
        name: "Resposta Genérica",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Responda à pergunta do cliente de forma útil e profissional. Se não souber a resposta, ofereça transferir para um atendente humano.",
          maxTokens: 200,
          temperature: 0.2
        }
      },
      {
        id: "human-handoff",
        type: "condition",
        name: "Transferir para Humano",
        config: {
          conditions: [
            {
              node: "other",
              field: "needsHuman",
              operator: "equals",
              value: true
            }
          ],
          truePath: "transfer",
          falsePath: "end"
        }
      },
      {
        id: "transfer",
        type: "transfer",
        name: "Transferir para Atendente",
        config: {
          message: "Entendemos que você precisa de ajuda personalizada. Um de nossos atendentes estará com você em breve.",
          channels: ["whatsapp", "instagram"]
        }
      },
      {
        id: "end",
        type: "end",
        name: "Finalizar",
        config: {
          message: "Obrigado por entrar em contato! Se precisar de mais ajuda, estou aqui.",
          saveContext: true
        }
      }
    ]
  },

  /**
   * Sales Assistant Template
   * For product recommendations and sales
   */
  SALES_ASSISTANT: {
    name: "Assistente de Vendas",
    description: "Template para recomendação de produtos e vendas",
    trigger: "comprar, produto, preço, valor, quanto custa",
    nodes: [
      {
        id: "start",
        type: "trigger",
        name: "Início",
        config: {
          triggerType: "keyword",
          keywords: ["comprar", "produto", "preço", "valor", "quanto custa", "quero"],
          channels: ["whatsapp", "instagram"]
        }
      },
      {
        id: "greet",
        type: "message",
        name: "Saudação Vendas",
        config: {
          message: "Bem-vindo(a) ao nosso catálogo virtual! Estou aqui para ajudar você a encontrar os melhores produtos.",
          delay: 1000
        }
      },
      {
        id: "ask-needs",
        type: "ai-prompt",
        name: "Entender Necessidades",
        config: {
          model: "gpt-4",
          prompt: "Identifique as necessidades do cliente com base na mensagem. Pergunte sobre sintomas, preferências ou orçamento se necessário.",
          maxTokens: 150
        }
      },
      {
        id: "recommend",
        type: "ai-recommendation",
        name: "Recomendar Produtos",
        config: {
          model: "gpt-3.5-turbo",
          knowledgeBase: "produtos_farmacia",
          prompt: "Recomende produtos farmacêuticos baseado nas necessidades do cliente. Inclua preços, benefícios e indicações.",
          maxProducts: 3,
          maxTokens: 400
        }
      },
      {
        id: "show-images",
        type: "media",
        name: "Mostrar Imagens",
        config: {
          mediaType: "image",
          imageUrls: ["{{recommend.product1.image}}", "{{recommend.product2.image}}", "{{recommend.product3.image}}"]
        }
      },
      {
        id: "ask-purchase",
        type: "ai-prompt",
        name: "Perguntar Sobre Compra",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Pergunte se o cliente deseja comprar os produtos recomendados. Ofereça opções de pagamento e entrega.",
          maxTokens: 100
        }
      },
      {
        id: "purchase-flow",
        type: "condition",
        name: "Flow de Compra",
        config: {
          conditions: [
            {
              node: "ask-purchase",
              field: "wantsPurchase",
              operator: "equals",
              value: true
            }
          ],
          truePath: "checkout",
          falsePath: "end"
        }
      },
      {
        id: "checkout",
        type: "ai-checkout",
        name: "Processar Compra",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Guie o cliente pelo processo de compra. Colete informações necessárias e confirme o pedido.",
          paymentMethods: ["cartão", "pix", "dinheiro"],
          deliveryOptions: ["retirada", "entrega", "delivery"],
          maxTokens: 300
        }
      },
      {
        id: "confirm-order",
        type: "message",
        name: "Confirmar Pedido",
        config: {
          message: "Pedido confirmado! Obrigado por comprar conosco. Seu pedido está sendo processado.",
          delay: 2000
        }
      },
      {
        id: "end",
        type: "end",
        name: "Finalizar Venda",
        config: {
          message: "Obrigado pela preferência! Estamos ansiosos para atendê-lo novamente.",
          saveContext: true,
          followUp: true
        }
      }
    ]
  },

  /**
   * FAQ Assistant Template
   * For frequently asked questions
   */
  FAQ_ASSISTANT: {
    name: "Assistente de FAQ",
    description: "Template para responder perguntas frequentes",
    trigger: "perguntas, dúvidas, como fazer, onde fica, qual é",
    nodes: [
      {
        id: "start",
        type: "trigger",
        name: "Início FAQ",
        config: {
          triggerType: "keyword",
          keywords: ["perguntas", "dúvidas", "como fazer", "onde fica", "qual é", "horário"],
          channels: ["whatsapp", "instagram"]
        }
      },
      {
        id: "greet",
        type: "message",
        name: "Saudação FAQ",
        config: {
          message: "Tenho respostas para as perguntas mais frequentes! O que você gostaria de saber?",
          delay: 1000
        }
      },
      {
        id: "extract-question",
        type: "ai-extract",
        name: "Extrair Pergunta",
        config: {
          model: "gpt-4",
          prompt: "Extraia a pergunta principal do cliente. Identifique o tópico: horários, localização, formas de pagamento, políticas, etc.",
          maxTokens: 100
        }
      },
      {
        id: "knowledge-search",
        type: "knowledge-search",
        name: "Buscar no Conhecimento",
        config: {
          knowledgeBase: "faq_farmacia",
          searchType: "semantic",
          maxResults: 5
        }
      },
      {
        id: "select-best",
        type: "ai-select",
        name: "Selecionar Melhor Resposta",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Selecione a melhor resposta entre os resultados da busca. Priorize precisão e clareza.",
          maxTokens: 50
        }
      },
      {
        id: "format-response",
        type: "ai-format",
        name: "Formatar Resposta",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Formate a resposta de forma clara e amigável. Use listas se necessário e mantenha tom profissional.",
          maxTokens: 200
        }
      },
      {
        id: "ask-more",
        type: "ai-prompt",
        name: "Perguntar Mais",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Pergunte se o cliente tem mais dúvidas ou precisa de esclarecimentos adicionais.",
          maxTokens: 80
        }
      },
      {
        id: "end",
        type: "end",
        name: "Finalizar FAQ",
        config: {
          message: "Espero ter ajudado! Estamos sempre aqui para esclarecer suas dúvidas.",
          saveContext: true
        }
      }
    ]
  },

  /**
   * Appointment Scheduler Template
   * For booking appointments and consultations
   */
  APPOINTMENT_SCHEDULER: {
    name: "Agendamento de Consultas",
    description: "Template para agendamento de consultas e horários",
    trigger: "marcar, consulta, horário, agendar, quando",
    nodes: [
      {
        id: "start",
        type: "trigger",
        name: "Início Agendamento",
        config: {
          triggerType: "keyword",
          keywords: ["marcar", "consulta", "horário", "agendar", "quando", "disponível"],
          channels: ["whatsapp", "instagram"]
        }
      },
      {
        id: "greet",
        type: "message",
        name: "Saudação Agendamento",
        config: {
          message: "Perfeito! Posso ajudar você a agendar uma consulta. Qual tipo de atendimento você precisa?",
          delay: 1000
        }
      },
      {
        id: "ask-type",
        type: "ai-prompt",
        name: "Perguntar Tipo",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Pergunte sobre o tipo de consulta: atendimento farmacêutico, vacinação, exames, outros.",
          maxTokens: 100
        }
      },
      {
        id: "check-availability",
        type: "api-call",
        name: "Verificar Disponibilidade",
        config: {
          endpoint: "/api/appointments/availability",
          method: "POST",
          body: {
            type: "{{ask-type.selectedType}}",
            date: "{{ask-type.selectedDate}}"
          },
          responsePath: "availableSlots"
        }
      },
      {
        id: "show-availability",
        type: "ai-format",
        name: "Mostrar Disponibilidades",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Formate as disponibilidades de forma clara. Mostre datas e horários em lista.",
          maxTokens: 150
        }
      },
      {
        id: "select-time",
        type: "ai-prompt",
        name: "Selecionar Horário",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Peça ao cliente para selecionar um horário da lista. Confirme se está correto.",
          maxTokens: 80
        }
      },
      {
        id: "confirm-appointment",
        type: "ai-confirm",
        name: "Confirmar Agendamento",
        config: {
          model: "gpt-3.5-turbo",
          prompt: "Resuma o agendamento e peça confirmação final. Inclua data, horário e tipo de consulta.",
          maxTokens: 120
        }
      },
      {
        id: "book-appointment",
        type: "api-call",
        name: "Reservar Horário",
        config: {
          endpoint: "/api/appointments/book",
          method: "POST",
          body: {
            customerId: "{{customer.id}}",
            type: "{{ask-type.selectedType}}",
            dateTime: "{{select-time.selectedTime}}",
            notes: "{{select-time.notes}}"
          },
          onSuccess: "appointment-confirmed",
          onError: "appointment-error"
        }
      },
      {
        id: "appointment-confirmed",
        type: "message",
        name: "Agendamento Confirmado",
        config: {
          message: "Ótimo! Seu agendamento foi confirmado para {{book-appointment.appointmentDate}} às {{book-appointment.appointmentTime}}.",
          delay: 2000
        }
      },
      {
        id: "send-reminder",
        type: "schedule",
        name: "Enviar Lembrete",
        config: {
          scheduleType: "cron",
          cronExpression: "0 9 * * 1", // Toda segunda às 9h
          message: "Lembrete: Você tem uma consulta amanhã às {{book-appointment.appointmentTime}}.",
          channels: ["whatsapp"]
        }
      },
      {
        id: "end",
        type: "end",
        name: "Finalizar Agendamento",
        config: {
          message: "Agradecemos por agendar conosco! Estamos ansiosos para atendê-lo.",
          saveContext: true
        }
      }
    ]
  }
};

export const AI_NODE_TYPES = {
  /**
   * AI Integration Nodes
   */
  "ai-classify": {
    name: "Classificar Intenção",
    description: "Classifica a intenção do cliente usando IA",
    icon: "🤖",
    config: {
      model: {
        type: "select",
        options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva a tarefa de classificação..."
      },
      maxTokens: {
        type: "number",
        default: 100,
        min: 10,
        max: 2000
      }
    }
  },

  "ai-response": {
    name: "Responder com IA",
    description: "Gera resposta usando IA com base no contexto",
    icon: "🤖",
    config: {
      model: {
        type: "select",
        options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      knowledgeBase: {
        type: "select",
        options: ["produtos_farmacia", "faq_farmacia", "conhecimento_geral"],
        required: false
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva o que a IA deve responder..."
      },
      maxTokens: {
        type: "number",
        default: 300,
        min: 10,
        max: 2000
      },
      temperature: {
        type: "number",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.1
      }
    }
  },

  "ai-recommendation": {
    name: "Recomendar Produtos",
    description: "Recomenda produtos baseado nas necessidades do cliente",
    icon: "🛍️",
    config: {
      model: {
        type: "select",
        options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      knowledgeBase: {
        type: "select",
        options: ["produtos_farmacia"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva como recomendar produtos..."
      },
      maxProducts: {
        type: "number",
        default: 3,
        min: 1,
        max: 10
      },
      maxTokens: {
        type: "number",
        default: 400,
        min: 10,
        max: 2000
      }
    }
  },

  "ai-extract": {
    name: "Extrair Informações",
    description: "Extrai informações específicas da mensagem",
    icon: "🔍",
    config: {
      model: {
        type: "select",
        options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva o que extrair..."
      },
      maxTokens: {
        type: "number",
        default: 100,
        min: 10,
        max: 1000
      }
    }
  },

  "ai-select": {
    name: "Selecionar Melhor Opção",
    description: "Seleciona a melhor opção entre múltiplas escolhas",
    icon: "✅",
    config: {
      model: {
        type: "select",
        options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva os critérios de seleção..."
      },
      maxTokens: {
        type: "number",
        default: 50,
        min: 10,
        max: 500
      }
    }
  },

  "ai-format": {
    name: "Formatar Resposta",
    description: "Formata resposta para melhor legibilidade",
    icon: "📝",
    config: {
      model: {
        type: "select",
        options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva como formatar..."
      },
      maxTokens: {
        type: "number",
        default: 200,
        min: 10,
        max: 1000
      }
    }
  },

  "ai-confirm": {
    name: "Confirmar Ação",
    description: "Confirma ações com o cliente",
    icon: "✅",
    config: {
      model: {
        type: "select",
        options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva o que confirmar..."
      },
      maxTokens: {
        type: "number",
        default: 120,
        min: 10,
        max: 500
      }
    }
  },

  "ai-checkout": {
    name: "Processar Compra",
    description: "Guia o cliente pelo processo de compra",
    icon: "🛒",
    config: {
      model: {
        type: "select",
        options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
        required: true
      },
      prompt: {
        type: "textarea",
        required: true,
        placeholder: "Descreva o processo de compra..."
      },
      paymentMethods: {
        type: "select",
        multiple: true,
        options: ["cartão", "pix", "dinheiro", "boleto"],
        required: true
      },
      deliveryOptions: {
        type: "select",
        multiple: true,
        options: ["retirada", "entrega", "delivery", "motoboy"],
        required: true
      },
      maxTokens: {
        type: "number",
        default: 300,
        min: 10,
        max: 2000
      }
    }
  },

  "knowledge-search": {
    name: "Buscar no Conhecimento",
    description: "Busca informações em bases de conhecimento",
    icon: "🔍",
    config: {
      knowledgeBase: {
        type: "select",
        options: ["faq_farmacia", "produtos_farmacia", "politicas_farmacia", "conhecimento_geral"],
        required: true
      },
      searchType: {
        type: "select",
        options: ["semantic", "keyword", "hybrid"],
        required: true
      },
      maxResults: {
        type: "number",
        default: 5,
        min: 1,
        max: 20
      }
    }
  },

  "api-call": {
    name: "Chamar API",
    description: "Realiza chamadas para APIs externas",
    icon: "⚡",
    config: {
      endpoint: {
        type: "text",
        required: true,
        placeholder: "/api/some-endpoint"
      },
      method: {
        type: "select",
        options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        required: true
      },
      body: {
        type: "json",
        required: false,
        placeholder: "{\n  \"param1\": \"{{variable1}}\",\n  \"param2\": \"{{variable2}}\"\n}"
      },
      headers: {
        type: "json",
        required: false,
        placeholder: "{\n  \"Authorization\": \"Bearer {{token}}\",\n  \"Content-Type\": \"application/json\"\n}"
      },
      onSuccess: {
        type: "text",
        required: true,
        placeholder: "node-name"
      },
      onError: {
        type: "text",
        required: true,
        placeholder: "node-name"
      }
    }
  },

  "schedule": {
    name: "Agendar Tarefa",
    description: "Agenda tarefas para execução futura",
    icon: "⏰",
    config: {
      scheduleType: {
        type: "select",
        options: ["cron", "interval", "datetime"],
        required: true
      },
      cronExpression: {
        type: "text",
        required: false,
        placeholder: "0 9 * * 1" // Toda segunda às 9h
      },
      interval: {
        type: "number",
        required: false,
        placeholder: "300", // 5 minutos
        min: 60
      },
      message: {
        type: "textarea",
        required: true,
        placeholder: "Mensagem a ser enviada..."
      },
      channels: {
        type: "select",
        multiple: true,
        options: ["whatsapp", "instagram", "email", "sms"],
        required: true
      }
    }
  },

  "transfer": {
    name: "Transferir para Humano",
    description: "Transfere conversa para atendente humano",
    icon: "🤖⚡",
    config: {
      message: {
        type: "textarea",
        required: true,
        placeholder: "Mensagem informando transferência..."
      },
      channels: {
        type: "select",
        multiple: true,
        options: ["whatsapp", "instagram"],
        required: true
      },
      priority: {
        type: "select",
        options: ["low", "medium", "high", "urgent"],
        required: false,
        default: "medium"
      }
    }
  }
};

export const AI_KNOWLEDGE_BASES = {
  "faq_farmacia": {
    name: "FAQ da Farmácia",
    description: "Base de conhecimento com perguntas frequentes",
    content: `
## Horários de Funcionamento
- **Segunda a Sexta:** 8h às 20h
- **Sábados:** 8h às 18h
- **Domingos e Feriados:** Fechado

## Formas de Pagamento
- Dinheiro
- Cartão de Crédito (Visa, Mastercard, Elo)
- Cartão de Débito
- Pix
- Boleto Bancário

## Entrega e Retirada
- **Entrega:** Em até 2 horas (após confirmação)
- **Retirada na Loja:** Sem custo
- **Taxa de Entrega:** A partir de R$ 10,00 (varia por região)

## Políticas
- Troca em até 7 dias com nota fiscal
- Devolução em até 30 dias
- Produtos lacrados não são passíveis de troca
    `
  },

  "produtos_farmacia": {
    name: "Catálogo de Produtos",
    description: "Base de conhecimento com informações de produtos",
    content: `
## Medicamentos
- **Dipirona:** Analgésico e antifebril
- **Paracetamol:** Alívio de dor e febre
- **Ibuprofeno:** Anti-inflamatório

## Cosméticos
- **Protetor Solar FPS 50:** Proteção UVA/UVB
- **Hidratante Facial:** Para todos os tipos de pele
- **Shampoo Anticaspa:** Com cetoconazol

## Vitaminas
- **Vitamina C:** 1000mg
- **Centrum:** Multivitamínico completo
- **Lavitan:** Para energia e disposição
    `
  },

  "politicas_farmacia": {
    name: "Políticas da Farmácia",
    description: "Políticas e regulamentos da farmácia",
    content: `
## Privacidade
- Dados pessoais são protegidos conforme LGPD
- Informações médicas são confidenciais
- Compromisso com segurança dos dados

## Qualidade
- Produtos com registro na ANVISA
- Equipe técnica qualificada
- Controle de qualidade rigoroso

## Atendimento
- Atendimento personalizado
- Respeito às necessidades dos clientes
- Compromisso com satisfação
    `
  }
};

export const AI_DEFAULT_PROMPT = `
Você é um assistente virtual especializado em atendimento ao cliente para farmácias. Seu objetivo é fornecer informações precisas, ajudar com vendas e agendamentos, e oferecer suporte profissional.

## Regras Importantes:
1. **Seja Profissional:** Mantenha sempre um tom educado e profissional
2. **Conhecimento Farmacêutico:** Apenas forneça informações sobre produtos e medicamentos
3. **Limitações:** Não prescreva medicamentos ou dê diagnósticos médicos
4. **Segurança:** Priorize informações seguras e baseadas em evidências
5. **Transferência:** Se não tiver certeza, ofereça transferir para um atendente humano

## Contexto da Farmácia:
- Nome: Farmácia Francis
- Horários: Seg-Sex 8h-20h, Sáb 8h-18h
- Formas de pagamento: Dinheiro, Cartão, Pix
- Entrega: Até 2 horas, taxa a partir de R$ 10

## Responda as perguntas de forma clara, concisa e sempre oferecendo ajuda adicional se necessário.
`;

export const AI_ERROR_HANDLING = {
  fallbackMessages: [
    "Desculpe, não consegui entender sua pergunta. Poderia reformular?",
    "Parece que tivemos um problema técnico. Deixe-me transferir para um atendente humano.",
    "Gostaria de falar com um de nossos atendentes? Eles podem ajudar melhor com sua solicitação."
  ],
  
  validationRules: {
    maxLength: 2000,
    prohibitedContent: ["conteúdo explícito", "discurso de ódio", "informações falsas"],
    medicalRestrictions: ["prescrever medicamentos", "diagnosticar doenças", "dar conselhos médicos"]
  }
};

export const AI_CONTEXT_MANAGEMENT = {
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

export const AI_INTEGRATION_CONFIG = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-3.5-turbo",
      baseURL: "https://api.openai.com/v1"
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-sonnet-20240229",
      baseURL: "https://api.anthropic.com/v1"
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
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

export const AI_CONTEXT_MANAGEMENT = {
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