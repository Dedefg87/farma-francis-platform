/**
 * Rotas tRPC para funcionalidades de IA
 * Transcrição Whisper, Sugestões de Resposta, Análise de Sentimento
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from './_core/trpc';
import { invokeLLM } from './_core/llm';
import { transcribeAudio } from './_core/voiceTranscription';
import { getDb } from './db';
import { messages } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export const aiRouter = router({
  /**
   * Get AI Configuration
   */
  getConfig: adminProcedure.query(async () => {
    return {
      providers: {
        openai: { apiKey: !!process.env.OPENAI_API_KEY, model: "gpt-3.5-turbo" },
        anthropic: { apiKey: !!process.env.ANTHROPIC_API_KEY, model: "claude-3-sonnet" },
        google: { apiKey: !!process.env.GOOGLE_API_KEY, model: "gemini-pro" },
      },
      knowledgeBases: ["faq_farmacia", "produtos_farmacia", "politicas_farmacia"],
      defaultPrompt: "Você é um assistente virtual da Farmácia Francis. Forneça informações precisas e profissionais sobre medicamentos, produtos e serviços.",
      maxTokens: 1000,
      temperature: 0.3,
      fallbackEnabled: true,
      validationEnabled: true,
      maxResponseTime: 10000,
      maxRetries: 3,
    };
  }),

  /**
   * Process AI Conversation
   */
  processConversation: adminProcedure
    .input((raw: unknown) => {
      return z.object({
        templateId: z.string(),
        customerId: z.number(),
        channelId: z.string(),
        message: z.string(),
        context: z.record(z.unknown()).optional(),
      }).parse(raw);
    })
    .mutation(async ({ input }) => {
      const { processAIConversation } = await import("./ai-integration");
      const req = {
        body: input,
        headers: {},
      } as any;
      const res = {
        json: (data: unknown) => data,
        status: (code: number) => res,
      } as any;
      return await processAIConversation(req, res);
    }),

  /**
   * Process Automation Flow
   */
  processAutomation: adminProcedure
    .input((raw: unknown) => {
      return z.object({
        flowId: z.string(),
        triggerType: z.string(),
        triggerData: z.record(z.unknown()).optional(),
        customerId: z.number().optional(),
      }).parse(raw);
    })
    .mutation(async ({ input }) => {
      const { processAutomationFlow } = await import("./ai-integration");
      const req = {
        body: input,
        headers: {},
      } as any;
      const res = {
        json: (data: unknown) => data,
        status: (code: number) => res,
      } as any;
      return await processAutomationFlow(req, res);
    }),

  /**
   * Transcrever áudio usando Whisper
   */
  transcribeAudio: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        messageId: z.number(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language || 'pt',
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      // TODO: Adicionar campo transcription na tabela messages
      // const db = await getDb();
      // if (db) {
      //   await db
      //     .update(messages)
      //     .set({ transcription: result.text })
      //     .where(eq(messages.id, input.messageId));
      // }

      return {
        transcription: result.text,
        language: result.language || 'pt',
      };
    }),

  /**
   * Sugerir 3 respostas usando IA
   */
  suggestResponses: protectedProcedure
    .input(
      z.object({
        customerMessage: z.string(),
        customerName: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `Você é um assistente de atendimento de uma farmácia chamada Farma Francis.

Cliente: ${input.customerName}
Mensagem do cliente: "${input.customerMessage}"
${input.context ? `Contexto adicional: ${input.context}` : ''}

Gere 3 sugestões de resposta profissionais, empáticas e úteis. As respostas devem:
1. Ser cordiais e usar o nome do cliente
2. Responder diretamente à pergunta
3. Oferecer ajuda adicional quando apropriado
4. Ser concisas (máximo 2-3 frases cada)

Retorne apenas as 3 respostas, uma por linha, sem numeração.`;

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em atendimento farmacêutico.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content3 = response.choices[0].message.content;
      const text = typeof content3 === 'string' ? content3 : '';
      const suggestions = text
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .slice(0, 3);

      return { suggestions };
    }),

  /**
   * Analisar sentimento da mensagem
   */
  analyzeSentiment: protectedProcedure
    .input(
      z.object({
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `Analise o sentimento da seguinte mensagem de um cliente:

"${input.message}"

Classifique o sentimento como:
- "happy" (feliz, satisfeito, positivo)
- "neutral" (neutro, informativo)
- "frustrated" (frustrado, irritado, negativo)

Retorne apenas uma palavra: happy, neutral ou frustrated.`;

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'Você é um analisador de sentimentos especializado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices[0].message.content;
      const sentiment = (typeof content === 'string' ? content.trim().toLowerCase() : 'neutral') as 'happy' | 'neutral' | 'frustrated';

      return {
        sentiment: sentiment || 'neutral',
        confidence: 0.85, // Placeholder - pode ser melhorado com modelo específico
      };
    }),

  /**
   * Extrair dados de receita usando OCR
   */
  extractRecipeData: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }: { input: { imageUrl: string } }) => {
      // TODO: Integrar com OCR (Tesseract ou Cloud Vision)
      // Por enquanto, retorna estrutura de exemplo
      
      const prompt = `Analise esta imagem de receita médica e extraia:
1. Nome do medicamento
2. Dosagem
3. Quantidade prescrita
4. Nome do médico (se visível)
5. CRM do médico (se visível)

Imagem: ${input.imageUrl}

Retorne em formato JSON.`;

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de extração de dados de receitas médicas.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: input.imageUrl,
                },
              },
            ],
          },
        ],
      });

      const content2 = response.choices[0].message.content;
      const text = typeof content2 === 'string' ? content2 : '{}';
      
      try {
        const data = JSON.parse(text);
        return {
          medication: data.medication || '',
          dosage: data.dosage || '',
          quantity: data.quantity || '',
          doctorName: data.doctorName || '',
          doctorCRM: data.doctorCRM || '',
          confidence: 0.75,
        };
      } catch {
        return {
          medication: '',
          dosage: '',
          quantity: '',
          doctorName: '',
          doctorCRM: '',
          confidence: 0,
          error: 'Não foi possível extrair dados da receita',
        };
      }
    }),
});
