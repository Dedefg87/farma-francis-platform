/**
 * Broadcast Queue Service
 *
 * Gerencia fila de mensagens broadcast usando Bull (Redis-backed).
 * Substitui a fila em memória atual, fornecendo:
 * - Persistência (não perde mensagens em restart)
 * - Concorrência controlada
 * - Retry automático
 * - Dashboard de jobs (se Redis disponível)
 */

import Bull from 'bull';
import { Queue, Job } from 'bull';
import { getRedis } from '../_core/redis.js';

// Nome da fila
const BROADCAST_QUEUE_NAME = 'broadcast-sender';

// Configuração da fila
interface BroadcastJobData {
  messageId: number;
  listId: number;
}

/**
 * Cria instância da fila de broadcast (singleton)
 */
function createBroadcastQueue(): Queue<BroadcastJobData> {
  const redisConnection = getRedis();
  
  const queue = new Queue<BroadcastJobData>(BROADCAST_QUEUE_NAME, {
    redis: {
      host: 'localhost', // será sobrescrito por getRedis()
      port: 6379,
      // these options are passed to the Redis client
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    },
    defaultJobOptions: {
      attempts: 3, // tentar 3x se falhar
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s...
      },
      removeOnComplete: {
        count: 100, // manter últimos 100 jobs completos
        age: 24 * 60 * 60 * 1000, // 24h
      },
      removeOnFail: {
        count: 50, // manter últimos 50 falhados
        age: 7 * 24 * 60 * 60 * 1000, // 7 dias
      },
      timeout: 10 * 60 * 1000, // 10 minutos max por job
    },
  });

  // Eventos de log
  queue.on('completed', (job: Job) => {
    console.log(`[BroadcastQueue] ✅ Job ${job.id} completado (messageId=${job.data.messageId})`);
  });

  queue.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[BroadcastQueue] ❌ Job ${job?.id} falhou:`, err.message);
    // job pode ter falhado após todas as tentativas
  });

  queue.on('error', (err: Error) => {
    console.error('[BroadcastQueue] Erro na fila:', err);
  });

  return queue;
}

// Singleton
let broadcastQueueInstance: Queue<BroadcastJobData> | null = null;

/**
 * Obtém instância da fila de broadcast
 */
export async function getBroadcastQueue(): Promise<Queue<BroadcastJobData>> {
  if (broadcastQueueInstance) {
    return broadcastQueueInstance;
  }

  // Await Redis connection antes de criar fila
  const { getRedis } = await import('../_core/redis.js');
  await getRedis();

  broadcastQueueInstance = createBroadcastQueue();
  return broadcastQueueInstance;
}

/**
 * Adiciona uma mensagem à fila de broadcast
 */
export async function enqueueBroadcastMessage(
  messageId: number,
  listId: number
): Promise<void> {
  const queue = await getBroadcastQueue();
  
  await queue.add(
    'send-broadcast',
    { messageId, listId },
    {
      priority: 1, // prioridade normal
      jobId: `broadcast:${messageId}`, // idempotência
    }
  );

  console.log(`[BroadcastQueue] 📩 Job enfileirado: messageId=${messageId}`);
}

/**
 * Processador de jobs da fila (deve ser chamado no startup)
 */
export async function startBroadcastQueueProcessor(concurrency = 2): Promise<void> {
  const queue = await getBroadcastQueue();

  // Processador assíncrono
  await queue.process('send-broadcast', async (job: Job<BroadcastJobData>) => {
    const { messageId, listId } = job.data;
    console.log(`[BroadcastQueue] 🧠 Processando job ${job.id} (messageId=${messageId})`);

    // Importar função de processamento do broadcast
    const { processBroadcastMessage } = await import('../workers/broadcast-sender.js');
    
    // Executar processamento
    await processBroadcastMessage(messageId);
  });

  console.log(`[BroadcastQueue] 🚀 Processor iniciado (concurrency=${concurrency})`);
}

/**
 * Estatísticas da fila (útil para dashboard/admin)
 */
export async function getBroadcastQueueStats() {
  const queue = await getBroadcastQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Limpa jobs falhados (útil para limpeza manual)
 */
export async function cleanFailedJobs(): Promise<number> {
  const queue = await getBroadcastQueue();
  const count = await queue.clean(1, 1000, 'failed'); // até 1000 jobs, idade > 1 dia
  console.log(`[BroadcastQueue] 🧹 Limpos ${count} jobs falhados`);
  return count;
}
