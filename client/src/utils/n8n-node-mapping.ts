/**
 * N8N Node Type Mapping
 * Maps N8N node types to internal node types with proper icons and labels
 */

export interface N8NNodeMapping {
  internalType: string;
  label: string;
  icon: string;
  color: string;
  category: string;
}

/**
 * Comprehensive mapping of N8N node types to internal types
 */
export const n8nNodeTypeMap: Record<string, N8NNodeMapping> = {
  // Triggers
  "n8n-nodes-base.whatsAppTrigger": {
    internalType: "trigger",
    label: "WhatsApp Trigger",
    icon: "📱",
    color: "#25D366",
    category: "trigger",
  },
  "n8n-nodes-base.webhook": {
    internalType: "trigger",
    label: "Webhook",
    icon: "🔗",
    color: "#FF6B6B",
    category: "trigger",
  },
  "n8n-nodes-base.manualTrigger": {
    internalType: "trigger",
    label: "Manual Trigger",
    icon: "▶️",
    color: "#4ECDC4",
    category: "trigger",
  },
  "n8n-nodes-base.scheduleTrigger": {
    internalType: "trigger",
    label: "Schedule Trigger",
    icon: "⏰",
    color: "#95E1D3",
    category: "trigger",
  },

  // HTTP & API
  "n8n-nodes-base.httpRequest": {
    internalType: "api",
    label: "HTTP Request",
    icon: "🌐",
    color: "#667EEA",
    category: "integration",
  },
  "n8n-nodes-base.httpRequestNode": {
    internalType: "api",
    label: "HTTP Request",
    icon: "🌐",
    color: "#667EEA",
    category: "integration",
  },

  // AI & LLM
  "@n8n/n8n-nodes-langchain.openAi": {
    internalType: "ai",
    label: "OpenAI",
    icon: "🤖",
    color: "#10A37F",
    category: "ai",
  },
  "@n8n/n8n-nodes-langchain.lmChatOpenAi": {
    internalType: "ai",
    label: "OpenAI Chat",
    icon: "💬",
    color: "#10A37F",
    category: "ai",
  },
  "@n8n/n8n-nodes-langchain.agent": {
    internalType: "ai",
    label: "AI Agent",
    icon: "🧠",
    color: "#8B5CF6",
    category: "ai",
  },
  "n8n-nodes-base.openAi": {
    internalType: "ai",
    label: "OpenAI",
    icon: "🤖",
    color: "#10A37F",
    category: "ai",
  },

  // Database
  "n8n-nodes-base.mysql": {
    internalType: "database",
    label: "MySQL",
    icon: "🗄️",
    color: "#00758F",
    category: "database",
  },
  "n8n-nodes-base.postgres": {
    internalType: "database",
    label: "PostgreSQL",
    icon: "🐘",
    color: "#336791",
    category: "database",
  },
  "n8n-nodes-base.mongodb": {
    internalType: "database",
    label: "MongoDB",
    icon: "🍃",
    color: "#47A248",
    category: "database",
  },

  // Logic & Control
  "n8n-nodes-base.if": {
    internalType: "condition",
    label: "IF",
    icon: "🔀",
    color: "#F59E0B",
    category: "logic",
  },
  "n8n-nodes-base.switch": {
    internalType: "condition",
    label: "Switch",
    icon: "🎛️",
    color: "#F59E0B",
    category: "logic",
  },
  "n8n-nodes-base.merge": {
    internalType: "merge",
    label: "Merge",
    icon: "🔗",
    color: "#8B5CF6",
    category: "logic",
  },
  "n8n-nodes-base.splitInBatches": {
    internalType: "split",
    label: "Split In Batches",
    icon: "✂️",
    color: "#EC4899",
    category: "logic",
  },
  "n8n-nodes-base.loop": {
    internalType: "loop",
    label: "Loop",
    icon: "🔄",
    color: "#06B6D4",
    category: "logic",
  },

  // Data Transformation
  "n8n-nodes-base.set": {
    internalType: "set",
    label: "Set",
    icon: "📝",
    color: "#10B981",
    category: "data",
  },
  "n8n-nodes-base.code": {
    internalType: "function",
    label: "Code",
    icon: "💻",
    color: "#6366F1",
    category: "data",
  },
  "n8n-nodes-base.function": {
    internalType: "function",
    label: "Function",
    icon: "⚙️",
    color: "#6366F1",
    category: "data",
  },
  "n8n-nodes-base.itemLists": {
    internalType: "set",
    label: "Item Lists",
    icon: "📋",
    color: "#10B981",
    category: "data",
  },

  // Communication
  "n8n-nodes-base.sendEmail": {
    internalType: "message",
    label: "Send Email",
    icon: "✉️",
    color: "#EF4444",
    category: "communication",
  },
  "n8n-nodes-base.telegram": {
    internalType: "message",
    label: "Telegram",
    icon: "📨",
    color: "#0088CC",
    category: "communication",
  },
  "n8n-nodes-base.slack": {
    internalType: "message",
    label: "Slack",
    icon: "💬",
    color: "#4A154B",
    category: "communication",
  },

  // Trello
  "n8n-nodes-base.trello": {
    internalType: "api",
    label: "Trello",
    icon: "📊",
    color: "#0079BF",
    category: "integration",
  },

  // Wait/Delay
  "n8n-nodes-base.wait": {
    internalType: "delay",
    label: "Wait",
    icon: "⏱️",
    color: "#F59E0B",
    category: "utility",
  },

  // Error Handling
  "n8n-nodes-base.errorTrigger": {
    internalType: "trigger",
    label: "Error Trigger",
    icon: "⚠️",
    color: "#EF4444",
    category: "utility",
  },
};

/**
 * Convert N8N node type to internal type
 */
export function convertN8NNodeType(n8nType: string): string {
  const mapping = n8nNodeTypeMap[n8nType];
  return mapping ? mapping.internalType : "api"; // Default to "api" for unknown types
}

/**
 * Get node display information from N8N type
 */
export function getN8NNodeInfo(n8nType: string): N8NNodeMapping {
  const mapping = n8nNodeTypeMap[n8nType];
  if (mapping) {
    return mapping;
  }
  
  // Default fallback for unknown types
  return {
    internalType: "api",
    label: n8nType.split(".").pop() || "Unknown Node",
    icon: "🔌",
    color: "#6B7280",
    category: "integration",
  };
}

/**
 * Check if a node type is from N8N
 */
export function isN8NNodeType(type: string): boolean {
  return type?.startsWith?.("n8n-nodes-base.") || type?.startsWith?.("@n8n/");
}

/**
 * Extract human-readable name from N8N node type
 */
export function extractN8NNodeName(type: string): string {
  // Remove package prefix
  const withoutPackage = type.replace(/^n8n-nodes-base\./, "").replace(/^@n8n\/n8n-nodes-langchain\./, "");
  
  // Convert camelCase to Title Case
  const titleCase = withoutPackage
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
  
  return titleCase;
}
