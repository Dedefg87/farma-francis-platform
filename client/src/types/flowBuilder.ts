import { Node, Edge } from 'reactflow';

// Node types
export type NodeType =
  | 'trigger'
  | 'condition'
  | 'message'
  | 'aiAssistant'
  | 'transferHuman'
  | 'createTicket'
  | 'wait'
  | 'setVariable'
  | 'httpRequest'
  | 'uraMenu';

// Trigger node data
export interface TriggerNodeData {
  type: 'message_received' | 'keyword' | 'schedule';
  keywords?: string[]; // For keyword trigger
  schedule?: {
    type: 'time' | 'interval';
    time?: string; // HH:MM for time trigger
    interval?: number; // Minutes for interval trigger
  };
  channel?: 'whatsapp' | 'instagram' | 'both';
}

// Condition node data
export interface ConditionNodeData {
  type: 'if_else' | 'working_hours' | 'day_of_week' | 'variable';
  condition?: string; // Expression like "{{customer.status}} == 'vip'"
  workingHours?: {
    start: string; // HH:MM
    end: string; // HH:MM
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  daysOfWeek?: number[];
  variable?: {
    name: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
    value: string;
  };
}

// Message node data
export interface MessageNodeData {
  messageType: 'text' | 'image' | 'audio' | 'document' | 'video';
  content: string; // Text content or file URL
  caption?: string; // For media messages
  variables?: boolean; // Whether to parse {{variables}}
}

// AI Assistant node data
export interface AIAssistantNodeData {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro';
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  context?: {
    includeCustomerInfo: boolean;
    includeTicketHistory: boolean;
    includeConversationHistory: boolean;
  };
  saveResponse?: boolean; // Save AI response to variable
  variableName?: string;
}

// Transfer Human node data
export interface TransferHumanNodeData {
  transferType: 'department' | 'specific_agent' | 'available';
  department?: string;
  agentId?: number;
  message?: string; // Message to agent
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Create Ticket node data
export interface CreateTicketNodeData {
  subject: string; // Can include {{variables}}
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  assignTo?: 'auto' | 'department' | 'specific';
  department?: string;
  agentId?: number;
  tags?: string[];
}

// Wait node data
export interface WaitNodeData {
  duration: number; // In seconds
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  message?: string; // Optional message to show while waiting
}

// Set Variable node data
export interface SetVariableNodeData {
  variableName: string;
  valueType: 'static' | 'dynamic' | 'user_input';
  staticValue?: string;
  dynamicExpression?: string; // Like "{{customer.name}} - {{ticket.id}}"
  promptMessage?: string; // For user_input type
}

// HTTP Request node data
export interface HTTPRequestNodeData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string; // Can include {{variables}}
  headers?: Record<string, string>;
  body?: string; // JSON string, can include {{variables}}
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  saveResponse?: boolean;
  variableName?: string;
  timeout?: number;
}

// URA Menu node data
export interface URAMenuNodeData {
  welcomeMessage: string;
  options: Array<{
    key: string; // "1", "2", "3", etc.
    label: string;
    description?: string;
  }>;
  invalidOptionMessage?: string;
  maxAttempts?: number;
  timeout?: number; // Seconds to wait for response
}

// Union type for all node data
export type FlowNodeData =
  | TriggerNodeData
  | ConditionNodeData
  | MessageNodeData
  | AIAssistantNodeData
  | TransferHumanNodeData
  | CreateTicketNodeData
  | WaitNodeData
  | SetVariableNodeData
  | HTTPRequestNodeData
  | URAMenuNodeData;

// Custom node type with data
export interface FlowNode extends Node {
  type: NodeType;
  data: FlowNodeData & {
    label: string;
    description?: string;
  };
}

// Export Edge type for compatibility
export type FlowEdge = Edge;

// Flow data structure
export interface FlowData {
  nodes: FlowNode[];
  edges: Edge[];
  variables?: Record<string, any>; // Global variables
  metadata?: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Execution context
export interface ExecutionContext {
  flowId: number;
  executionId: string;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  ticket?: {
    id: number;
    subject: string;
    status: string;
    [key: string]: any;
  };
  message?: {
    content: string;
    channel: 'whatsapp' | 'instagram';
    timestamp: Date;
  };
  variables: Record<string, any>;
  history: Array<{
    nodeId: string;
    timestamp: Date;
    output?: any;
  }>;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  executionId: string;
  startedAt: Date;
  completedAt: Date;
  nodesExecuted: number;
  finalState: 'completed' | 'error' | 'waiting' | 'transferred';
  error?: string;
  output?: any;
}

// Node validation result
export interface NodeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Flow validation result
export interface FlowValidationResult {
  valid: boolean;
  errors: Array<{
    nodeId?: string;
    edgeId?: string;
    message: string;
  }>;
  warnings: Array<{
    nodeId?: string;
    message: string;
  }>;
}
