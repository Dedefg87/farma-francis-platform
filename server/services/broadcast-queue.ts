/**
 * Broadcast Queue Service
 *
 * Gerencia fila de mensagens broadcast usando Bull (Redis-backed).
 * Substitui a fila em memória atual, fornecendo:
 * - Persistência (não perde mensagens em restart)
 * - Concorrência controlada
 * - Retry automático
 * - Dashboard de jobs (se Redis disponível)
 *
 * Namespace: broadcast: / queue:
 */

import * as Bull from 'bull';
import { getRedis } from '../_core/redis.js';
import { getQueueRedis, REDIS_NAMESPACES } from '../_core/redis-namespaces.js';

// Nome da fila
const BROADCAST_QUEUE_NAME = 'broadcast-sender';

// Tipos Bull (namespace)
type Queue<TData = any> = Bull.Queue<TData>;
type Job<TData = any> = Bull.Job<TData>;

// Configuração da fila
interface BroadcastJobData {
  messageId: number;
  listId: number;
}

/**
 * Cria instância da fila de broadcast (singleton)
 */
function createBroadcastQueue(): Queue<BroadcastJobData> {
  // Usar cliente Redis namespaced para queue
  const redisClient = getRedis(); // base connection

  const queue = new Bull.Queue<BroadcastJobData>(BROADCAST_QUEUE_NAME, {
    redis: {
      client: redisClient as any,
      // BullMQ adiciona prefix automaticamente se keyPrefix fornecido
      keyPrefix: REDIS_NAMESPACES.QUEUE, // usa 'queue:'
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 60 * 60 * 1000,
      },
      removeOnFail: {
        count: 50,
        age: 7 * 24 * 60 * 60 * 1000,
      },
      timeout: 10 * 60 * 1000,
    },
  });

  // Eventos de log
  queue.on('completed', (job: Job<BroadcastJobData>) => {
    console.log(`[BroadcastQueue] ✅ Job ${job.id} completado (messageId=${job.data.messageId})`);
  });

  queue.on('failed', (job: Job<BroadcastJobData> | undefined, err: Error) => {
    console.error(`[BroadcastQueue] ❌ Job ${job?.id} falhou:`, err.message);
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
      priority: 1,
      jobId: `broadcast:${messageId}`,
    }
  );

  console.log(`[BroadcastQueue] 📩 Job enfileirado (namespace:${REDIS_NAMESPACES.QUEUE}): messageId=${messageId}`);
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

  console.log(`[BroadcastQueue] 🚀 Processor iniciado (concurrency=${concurrency}, namespace:${REDIS_NAMESPACES.QUEUE})`);
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
  const count = await queue.clean(1, 1000, 'failed');
  console.log(`[BroadcastQueue] 🧹 Limpos ${count} jobs falhados`);
  return count;
}
