import React from "react";

// ==================== TYPES ====================

export interface NodeError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  category: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  config?: ConfigField[];
  errors?: NodeError[];
}

export interface NodePort {
  id: string;
  label: string;
  type: 'data' | 'trigger' | 'error' | 'success';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'prompt' | 'password' | 'file';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
  multiline?: boolean;
}

// ==================== CATEGORIES ====================

export const CATEGORIES: { id: string; label: string; color: string; icon: React.ComponentType }[] = [];

// ==================== NODE DEFINITIONS ====================

export const NODE_TYPES: WorkflowNode[] = [];

// ==================== HELPER FUNCTIONS ====================

export const getNodeType = (type: string): WorkflowNode | undefined => {
  return NODE_TYPES.find(n => n.id === type);
};

export const getNodesByCategory = (categoryId: string): WorkflowNode[] => {
  return NODE_TYPES.filter(n => n.category === categoryId);
};

export const getAllCategories = () => {
  return CATEGORIES;
};
