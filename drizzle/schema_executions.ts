import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Tabela de execuções de fluxos
 */
export const flowExecutions = sqliteTable('flow_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id').notNull(),
  userId: integer('user_id').notNull(),
  
  // Status da execução
  status: text('status', { 
    enum: ['running', 'completed', 'failed', 'cancelled'] 
  }).notNull().default('running'),
  
  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  
  // Duração em milissegundos
  duration: integer('duration'),
  
  // Contexto de entrada
  inputContext: text('input_context', { mode: 'json' }),
  
  // Contexto de saída
  outputContext: text('output_context', { mode: 'json' }),
  
  // Erro se houver
  error: text('error'),
  errorStack: text('error_stack'),
  
  // Metadados
  totalNodes: integer('total_nodes').default(0),
  executedNodes: integer('executed_nodes').default(0),
  triggeredBy: text('triggered_by'), // 'manual', 'webhook', 'schedule', 'api'
});

/**
 * Tabela de execução de nós individuais
 */
export const nodeExecutions = sqliteTable('node_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  executionId: integer('execution_id').notNull(),
  nodeId: text('node_id').notNull(),
  nodeType: text('node_type').notNull(),
  nodeLabel: text('node_label'),
  
  // Status
  status: text('status', { 
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'] 
  }).notNull().default('pending'),
  
  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  
  // Duração em milissegundos
  duration: integer('duration'),
  
  // Contexto antes e depois
  inputData: text('input_data', { mode: 'json' }),
  outputData: text('output_data', { mode: 'json' }),
  
  // Erro se houver
  error: text('error'),
  
  // Ordem de execução
  executionOrder: integer('execution_order'),
});

/**
 * Tabela de analytics agregados por fluxo
 */
export const flowAnalytics = sqliteTable('flow_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id').notNull().unique(),
  
  // Contadores
  totalExecutions: integer('total_executions').default(0),
  successfulExecutions: integer('successful_executions').default(0),
  failedExecutions: integer('failed_executions').default(0),
  
  // Tempos médios
  avgDuration: integer('avg_duration'), // em milissegundos
  minDuration: integer('min_duration'),
  maxDuration: integer('max_duration'),
  
  // Taxa de sucesso (0-100)
  successRate: integer('success_rate').default(0),
  
  // Última execução
  lastExecutionAt: integer('last_execution_at', { mode: 'timestamp' }),
  lastExecutionStatus: text('last_execution_status'),
  
  // Nós mais usados (JSON array de {nodeId, count})
  mostUsedNodes: text('most_used_nodes', { mode: 'json' }),
  
  // Pontos de abandono (JSON array de {nodeId, count})
  abandonmentPoints: text('abandonment_points', { mode: 'json' }),
  
  // Atualizado em
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
});

/**
 * Tabela de versões de fluxos
 */
export const flowVersions = sqliteTable('flow_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id').notNull(),
  version: integer('version').notNull(),
  
  // Snapshot completo do fluxo
  nodes: text('nodes', { mode: 'json' }).notNull(),
  edges: text('edges', { mode: 'json' }).notNull(),
  
  // Metadados da versão
  commitMessage: text('commit_message'),
  createdBy: integer('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  
  // Diff com versão anterior (opcional)
  diff: text('diff', { mode: 'json' }),
});

/**
 * Tabela de tags de fluxos
 */
export const flowTags = sqliteTable('flow_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#3b82f6'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
});

/**
 * Tabela de relação entre fluxos e tags (many-to-many)
 */
export const flowTagRelations = sqliteTable('flow_tag_relations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id').notNull(),
  tagId: integer('tag_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
});

/**
 * Tabela de notificações
 */
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  
  // Tipo de notificação
  type: text('type', { 
    enum: ['flow_activated', 'flow_deactivated', 'execution_failed', 'execution_completed', 'variable_changed', 'system'] 
  }).notNull(),
  
  // Conteúdo
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Relacionamento
  flowId: integer('flow_id'),
  executionId: integer('execution_id'),
  
  // Status
  read: integer('read', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch() * 1000)`),
  readAt: integer('read_at', { mode: 'timestamp' }),
});
