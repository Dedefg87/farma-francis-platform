// Tipos compartilhados para Dashboard e estatísticas

export interface AgentStats {
  agentId: number;
  agentName: string;
  photo: string | null;
  totalConversations: number;
  daysActive: number;
  avgPerDay: number;
  messagesSent: number;
  messagesReceived: number;
  tma: string;
  sla?: number | null;
}

export interface DashboardSummary {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  avgPerAgent: number;
  avgHandlingTime: string;
  sla?: number | null;
}

export interface ChannelStats {
  channel: string;
  count: number;
}

export interface StatusStats {
  status: string;
  count: number;
}

export interface HourlyContacts {
  hora: string;
  chats: number;
}

export interface QueueStats {
  name: string;
  value: number;
  color: string;
}

export interface VariationMetrics {
  metric: string;
  currentValue: number;
  previousValue: number;
  variation: number;
  variationPercentage: number;
  trend: 'up' | 'down' | 'stable';
}
