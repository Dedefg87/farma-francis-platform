// Tipos compartilhados para Agentes

export interface Agent {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'busy' | 'away';
  role: 'admin' | 'agent' | 'supervisor';
  skills: string[];
  languages: string[];
  maxConcurrentConversations: number;
  currentConversations: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AgentCreate {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  status?: 'online' | 'offline' | 'busy' | 'away';
  role?: 'admin' | 'agent' | 'supervisor';
  skills?: string[];
  languages?: string[];
  maxConcurrentConversations?: number;
  isActive?: boolean;
}

export interface AgentUpdate {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  status?: 'online' | 'offline' | 'busy' | 'away';
  role?: 'admin' | 'agent' | 'supervisor';
  skills?: string[];
  languages?: string[];
  maxConcurrentConversations?: number;
  isActive?: boolean;
}
