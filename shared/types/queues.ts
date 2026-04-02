// Tipos compartilhados para Filas (Queues)
import { ConversationChannel } from './conversations';

export interface Queue {
  id: string;
  name: string;
  description: string | null;
  channel: ConversationChannel;
  maxWaitTime: number; // em segundos
  maxSize: number;
  currentSize: number;
  waitingCount: number;
  assignedAgents: string[]; // IDs dos agentes
  routingRules: RoutingRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: unknown;
}

export interface RoutingAction {
  type: 'assignAgent' | 'assignSkill' | 'setPriority' | 'addTag' | 'notify';
  parameters: Record<string, unknown>;
}
