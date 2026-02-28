import { Node, Edge } from "reactflow";

// Tipos de fluxo
export interface VisualFlow {
  id: number;
  name: string;
  description?: string | null;
  flowData: string;
  isActive: boolean | number;
  executionCount?: number;
  updatedAt: string | Date;
}

export interface AutomationFlow {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  channel: string;
  isActive: boolean;
}

export interface URAMenu {
  id: number;
  name: string;
  welcomeMessage: string;
  isActive: boolean;
  updatedAt: string;
}

// Template de fluxo
export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  nodes: Node[];
  edges: Edge[];
}

// Estado do fluxo
export interface FlowState {
  selectedFlowId: number | null;
  isCreating: boolean;
  isImporting: boolean;
  importFile: File | null;
  importLoading: boolean;
  importProgress: number;
  selectedNode: Node | null;
  isConfigOpen: boolean;
  newFlowName: string;
  newFlowDescription: string;
}

// Ações do fluxo
export type FlowAction =
  | { type: "SET_SELECTED_FLOW"; payload: number | null }
  | { type: "SET_CREATING"; payload: boolean }
  | { type: "SET_IMPORTING"; payload: boolean }
  | { type: "SET_IMPORT_FILE"; payload: File | null }
  | { type: "SET_IMPORT_LOADING"; payload: boolean }
  | { type: "SET_IMPORT_PROGRESS"; payload: number }
  | { type: "SET_SELECTED_NODE"; payload: Node | null }
  | { type: "SET_CONFIG_OPEN"; payload: boolean }
  | { type: "SET_NEW_FLOW_NAME"; payload: string }
  | { type: "SET_NEW_FLOW_DESCRIPTION"; payload: string }
  | { type: "RESET_IMPORT" };
