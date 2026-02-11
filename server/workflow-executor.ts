/**
 * Professional N8N-style Workflow Executor
 * Executes workflows with full support for variables, expressions, error handling, retry, and logging
 */

import { getDb } from "./db";
import {
  visualFlows,
  workflowExecutions,
  executionData,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

// Types
export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    config: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface ExecutionContext {
  workflow: {
    id: number;
    name: string;
  };
  execution: {
    id: number;
    mode: string;
  };
  nodes: Map<string, WorkflowNode>;
  edges: WorkflowEdge[];
  nodeOutputs: Map<string, any>; // Stores output of each executed node
  variables: Map<string, any>; // Global variables
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Main Workflow Executor Class
 */
export class WorkflowExecutor {
  private context: ExecutionContext;

  constructor(
    workflowId: number,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    triggerData?: any
  ) {
    this.context = {
      workflow: { id: workflowId, name: "" },
      execution: { id: 0, mode: "manual" },
      nodes: new Map(nodes.map(n => [n.id, n])),
      edges,
      nodeOutputs: new Map(),
      variables: new Map(),
    };

    // Store trigger data
    if (triggerData) {
      this.context.variables.set("trigger", triggerData);
    }
  }

  /**
   * Execute entire workflow
   */
  async execute(
    triggeredBy?: number
  ): Promise<{ success: boolean; executionId: number; error?: string }> {
    const startTime = Date.now();

    // Create execution record
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [execution] = await db.insert(workflowExecutions).values({
      workflowId: this.context.workflow.id,
      status: "running",
      mode: "manual",
      triggeredBy,
      triggerData: JSON.stringify(this.context.variables.get("trigger") || {}),
    });

    this.context.execution.id = execution.insertId;

    try {
      // Find start node (trigger)
      const startNode = Array.from(this.context.nodes.values()).find(
        n => n.type === "trigger" || n.data.config.trigger
      );

      if (!startNode) {
        throw new Error("No trigger node found");
      }

      // Execute from start node
      await this.executeNode(startNode.id);

      // Update execution as success
      const executionTime = Date.now() - startTime;
      const dbUpdate = await getDb();
      if (!dbUpdate) throw new Error("Database not available");

      await dbUpdate
        .update(workflowExecutions)
        .set({
          status: "success",
          finishedAt: new Date(),
          executionTime,
        })
        .where(eq(workflowExecutions.id, this.context.execution.id));

      return { success: true, executionId: this.context.execution.id };
    } catch (error: any) {
      // Update execution as error
      const executionTime = Date.now() - startTime;
      const dbError = await getDb();
      if (!dbError) throw new Error("Database not available");

      await dbError
        .update(workflowExecutions)
        .set({
          status: "error",
          finishedAt: new Date(),
          executionTime,
          error: error.message,
        })
        .where(eq(workflowExecutions.id, this.context.execution.id));

      return {
        success: false,
        executionId: this.context.execution.id,
        error: error.message,
      };
    }
  }

  /**
   * Execute single node with retry logic
   */
  private async executeNode(
    nodeId: string,
    retryCount: number = 0
  ): Promise<void> {
    const node = this.context.nodes.get(nodeId);
    if (!node) return;

    const startTime = Date.now();
    const maxRetries = node.data.config.retryOnFail
      ? node.data.config.maxRetries || 3
      : 0;

    try {
      // Get input data from previous nodes
      const inputData = this.getNodeInputData(nodeId);

      // Execute node based on type
      const result = await this.executeNodeByType(node, inputData);

      if (!result.success) {
        throw new Error(result.error || "Node execution failed");
      }

      // Store output
      this.context.nodeOutputs.set(nodeId, result.data);

      // Log successful execution
      const executionTime = Date.now() - startTime;
      const dbLog = await getDb();
      if (!dbLog) throw new Error("Database not available");

      await dbLog.insert(executionData).values({
        executionId: this.context.execution.id,
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.type,
        status: "success",
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        executionTime,
        inputData: JSON.stringify(inputData),
        outputData: JSON.stringify(result.data),
        retryCount,
      });

      // Execute next nodes
      await this.executeNextNodes(nodeId, result.data);
    } catch (error: any) {
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(
          `[Workflow Executor] Retrying node ${node.data.label} (attempt ${retryCount + 1}/${maxRetries})`
        );
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        ); // Exponential backoff
        return this.executeNode(nodeId, retryCount + 1);
      }

      // Log failed execution
      const executionTime = Date.now() - startTime;
      const dbFail = await getDb();
      if (!dbFail) throw new Error("Database not available");

      await dbFail.insert(executionData).values({
        executionId: this.context.execution.id,
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.type,
        status: "error",
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        executionTime,
        inputData: JSON.stringify(this.getNodeInputData(nodeId)),
        error: error.message,
        retryCount,
      });

      // Check if should continue on fail
      if (!node.data.config.continueOnFail) {
        throw error;
      }

      console.log(
        `[Workflow Executor] Node ${node.data.label} failed but continuing: ${error.message}`
      );
    }
  }

  /**
   * Execute node based on its type
   */
  private async executeNodeByType(
    node: WorkflowNode,
    inputData: any
  ): Promise<NodeExecutionResult> {
    const config = node.data.config;

    switch (node.type) {
      case "trigger":
        return {
          success: true,
          data: this.context.variables.get("trigger") || {},
        };

      case "message":
        // Send message node
        return {
          success: true,
          data: { message: this.resolveExpression(config.message, inputData) },
        };

      case "condition":
      case "if":
        // Condition node - evaluate expression
        const condition = this.evaluateCondition(config, inputData);
        return {
          success: true,
          data: { result: condition, path: condition ? "true" : "false" },
        };

      case "ai":
      case "aiAssistant":
        // AI Assistant node
        return await this.executeAINode(config, inputData);

      case "http":
      case "httpRequest":
        // HTTP Request node
        return await this.executeHTTPNode(config, inputData);

      case "database":
      case "dbQuery":
        // Database Query node
        return await this.executeDatabaseNode(config, inputData);

      case "function":
      case "code":
        // Function/Code node - execute JavaScript
        if (config.function === "get_greeting") {
          return this.executeGreetingFunction(config, inputData);
        }
        return await this.executeFunctionNode(config, inputData);

      case "set":
        // Set node - manipulate data
        return this.executeSetNode(config, inputData);

      case "split":
      case "splitInBatches":
        // Split array into batches
        return this.executeSplitNode(config, inputData);

      case "merge":
        // Merge multiple inputs
        return this.executeMergeNode(config, inputData);

      case "loop":
      case "loopOverItems":
        // Loop over items
        return await this.executeLoopNode(node, config, inputData);

      case "switch":
        // Switch node - multiple paths
        return this.executeSwitchNode(config, inputData);

      case "wait":
      case "delay":
        // Wait/Delay node
        return await this.executeWaitNode(config);

      case "transfer":
      case "transferHuman":
        // Transfer to human
        return {
          success: true,
          data: { transferred: true, department: config.department },
        };

      default:
        console.log(`[Workflow Executor] Unknown node type: ${node.type}`);
        return { success: true, data: inputData };
    }
  }

  /**
   * Execute AI Assistant node
   */
  private async executeAINode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const prompt = this.resolveExpression(
        config.prompt || config.systemPrompt,
        inputData
      );
      const userMessage = this.resolveExpression(
        config.userMessage || inputData.message || "",
        inputData
      );

      const response = await invokeLLM({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMessage },
        ],
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      return { success: true, data: { response: aiResponse, raw: response } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute HTTP Request node
   */
  private async executeHTTPNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const url = this.resolveExpression(config.url, inputData);
      const method = config.method || "GET";
      const headers = config.headers || {};
      const body = config.body
        ? this.resolveExpression(config.body, inputData)
        : undefined;

      const options: RequestInit = {
        method,
        headers: this.resolveObject(headers, inputData),
      };

      if (body && method !== "GET") {
        options.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      return {
        success: response.ok,
        data: {
          statusCode: response.status,
          body: data,
          headers: Object.fromEntries(response.headers.entries()),
        },
        error: response.ok
          ? undefined
          : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Database Query node
   */
  private async executeDatabaseNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const query = this.resolveExpression(config.query, inputData);

      // Execute query (simplified - in production use proper query builder)
      const dbQuery = await getDb();
      if (!dbQuery) throw new Error("Database not available");

      const result = await dbQuery.execute(query as any);

      return { success: true, data: { rows: result, count: result.length } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute greeting function - returns appropriate greeting based on time
   */
  private executeGreetingFunction(
    config: any,
    inputData: any
  ): NodeExecutionResult {
    try {
      const hour = new Date().getHours();
      let greeting = "Bom dia";

      if (hour >= 12 && hour < 18) {
        greeting = "Boa tarde";
      } else if (hour >= 18) {
        greeting = "Boa noite";
      }

      const agentName =
        inputData.agent_name || inputData.assignedToName || "Atendente";

      return {
        success: true,
        data: {
          greeting,
          agent_name: agentName,
          hour,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Function/Code node - runs JavaScript
   */
  private async executeFunctionNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const code = config.code || config.functionCode || "";

      // Create safe execution context
      const $input = inputData;
      const $json = inputData;
      const $vars = Object.fromEntries(this.context.variables);

      // Execute code
      const AsyncFunction = Object.getPrototypeOf(async function () {
        return undefined;
      }).constructor;
      const fn = new AsyncFunction("$input", "$json", "$vars", code);
      const result = await fn($input, $json, $vars);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Set node - manipulate data
   */
  private executeSetNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const output = { ...inputData };

      // Apply set operations
      if (config.values) {
        for (const item of config.values) {
          const key = item.name || item.key;
          const value = this.resolveExpression(item.value, inputData);
          output[key] = value;
        }
      }

      // Remove fields
      if (config.removeFields) {
        for (const field of config.removeFields) {
          delete output[field];
        }
      }

      return Promise.resolve({ success: true, data: output });
    } catch (error: any) {
      return Promise.resolve({ success: false, error: error.message });
    }
  }

  /**
   * Execute Split node - split array into batches
   */
  private executeSplitNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const array = Array.isArray(inputData)
        ? inputData
        : inputData.items || [];
      const batchSize = config.batchSize || 10;

      const batches = [];
      for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
      }

      return Promise.resolve({
        success: true,
        data: { batches, count: batches.length },
      });
    } catch (error: any) {
      return Promise.resolve({ success: false, error: error.message });
    }
  }

  /**
   * Execute Merge node - combine multiple inputs
   */
  private executeMergeNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      // Get outputs from all previous nodes
      const inputs = Array.from(this.context.nodeOutputs.values());

      const mode = config.mode || "append";
      let result: any;

      if (mode === "append") {
        result = inputs.flat();
      } else if (mode === "merge") {
        result = Object.assign({}, ...inputs);
      } else {
        result = inputs;
      }

      return Promise.resolve({ success: true, data: result });
    } catch (error: any) {
      return Promise.resolve({ success: false, error: error.message });
    }
  }

  /**
   * Execute Loop node - iterate over items
   */
  private async executeLoopNode(
    node: WorkflowNode,
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const items = Array.isArray(inputData)
        ? inputData
        : inputData.items || [];
      const results = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Set loop variables
        this.context.variables.set("loop", {
          index: i,
          item,
          total: items.length,
        });

        // Execute loop body (next nodes)
        const loopOutput = await this.processLoopIteration(node.id, item);
        results.push(loopOutput);
      }

      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Switch node - multiple conditional paths
   */
  private executeSwitchNode(
    config: any,
    inputData: any
  ): Promise<NodeExecutionResult> {
    try {
      const value = this.resolveExpression(config.value, inputData);
      const cases = config.cases || [];

      for (const caseItem of cases) {
        if (caseItem.value === value || caseItem.condition === value) {
          return Promise.resolve({
            success: true,
            data: { matched: caseItem.value, path: caseItem.output },
          });
        }
      }

      // Default case
      return Promise.resolve({
        success: true,
        data: { matched: "default", path: "default" },
      });
    } catch (error: any) {
      return Promise.resolve({ success: false, error: error.message });
    }
  }

  /**
   * Execute Wait/Delay node
   */
  private async executeWaitNode(config: any): Promise<NodeExecutionResult> {
    const delay = config.delay || config.amount || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { success: true, data: { waited: delay } };
  }

  /**
   * Get input data for a node from previous nodes
   */
  private getNodeInputData(nodeId: string): any {
    const incomingEdges = this.context.edges.filter(e => e.target === nodeId);

    if (incomingEdges.length === 0) {
      return this.context.variables.get("trigger") || {};
    }

    if (incomingEdges.length === 1) {
      const sourceId = incomingEdges[0].source;
      return this.context.nodeOutputs.get(sourceId) || {};
    }

    // Multiple inputs - merge them
    const inputs = incomingEdges.map(
      e => this.context.nodeOutputs.get(e.source) || {}
    );
    return Object.assign({}, ...inputs);
  }

  /**
   * Execute next nodes after current node
   */
  private async executeNextNodes(
    currentNodeId: string,
    outputData: any
  ): Promise<void> {
    const outgoingEdges = this.context.edges.filter(
      e => e.source === currentNodeId
    );

    for (const edge of outgoingEdges) {
      // Check if edge has condition (for if/condition nodes)
      if (edge.sourceHandle) {
        const shouldExecute =
          edge.sourceHandle === outputData.path ||
          edge.sourceHandle === (outputData.result ? "true" : "false");
        if (!shouldExecute) continue;
      }

      await this.executeNode(edge.target);
    }
  }

  /**
   * Process single loop iteration
   */
  private async processLoopIteration(
    loopNodeId: string,
    item: any
  ): Promise<any> {
    // Find nodes inside loop (connected to loop node)
    const loopEdges = this.context.edges.filter(e => e.source === loopNodeId);

    if (loopEdges.length === 0) return item;

    // Execute first node in loop with item as input
    const firstNodeId = loopEdges[0].target;
    this.context.nodeOutputs.set(loopNodeId, item); // Set loop item as output

    await this.executeNode(firstNodeId);

    return this.context.nodeOutputs.get(firstNodeId) || item;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(config: any, inputData: any): boolean {
    try {
      // Check for special condition types used by chatbot
      if (config.condition === "working_hours") {
        return this.checkWorkingHours(config.schedule);
      }

      if (config.condition === "agent_logged_in") {
        return this.checkAgentLoggedIn(inputData);
      }

      if (config.condition?.includes("close_reason")) {
        const closeReason = inputData.close_reason || inputData.closeReason;
        const expectedReason = config.condition
          .split("==")[1]
          ?.trim()
          .replace(/"/g, "");
        return closeReason === expectedReason;
      }

      const left = this.resolveExpression(
        config.value1 || config.left,
        inputData
      );
      const operator = config.operator || config.comparison || "equals";
      const right = this.resolveExpression(
        config.value2 || config.right,
        inputData
      );

      switch (operator) {
        case "equals":
        case "===":
          return left === right;
        case "notEquals":
        case "!==":
          return left !== right;
        case "contains":
          return String(left).includes(String(right));
        case "notContains":
          return !String(left).includes(String(right));
        case "startsWith":
          return String(left).startsWith(String(right));
        case "endsWith":
          return String(left).endsWith(String(right));
        case "greater":
        case ">":
          return Number(left) > Number(right);
        case "greaterOrEquals":
        case ">=":
          return Number(left) >= Number(right);
        case "less":
        case "<":
          return Number(left) < Number(right);
        case "lessOrEquals":
        case "<=":
          return Number(left) <= Number(right);
        case "regex":
          return new RegExp(String(right)).test(String(left));
        case "isEmpty":
          return (
            !left || left === "" || (Array.isArray(left) && left.length === 0)
          );
        case "isNotEmpty":
          return (
            !!left && left !== "" && (!Array.isArray(left) || left.length > 0)
          );
        default:
          return false;
      }
    } catch (error) {
      console.error("[Workflow Executor] Condition evaluation error:", error);
      return false;
    }
  }

  /**
   * Check if current time is within working hours
   * Mon-Sat: 08:00-19:40
   * Sun/Holidays: 08:00-11:40
   */
  private checkWorkingHours(schedule?: any): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute; // Convert to minutes

    // Use provided schedule or defaults
    const monSatStart = schedule?.mon_sat?.start || "08:00";
    const monSatEnd = schedule?.mon_sat?.end || "19:40";
    const sunHolidayStart = schedule?.sun_holiday?.start || "08:00";
    const sunHolidayEnd = schedule?.sun_holiday?.end || "11:40";

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Check if it's Sunday (0) or holiday (simplified - in production use holiday API)
    const isSundayOrHoliday = day === 0; // Simplified - just checking Sunday

    if (isSundayOrHoliday) {
      const start = parseTime(sunHolidayStart);
      const end = parseTime(sunHolidayEnd);
      return currentTime >= start && currentTime <= end;
    } else {
      // Monday (1) to Saturday (6)
      const start = parseTime(monSatStart);
      const end = parseTime(monSatEnd);
      return currentTime >= start && currentTime <= end;
    }
  }

  /**
   * Check if agent is logged in
   */
  private checkAgentLoggedIn(inputData: any): boolean {
    // Check if assignedTo or agent_id exists in input data
    return !!(
      inputData.assignedTo ||
      inputData.agent_id ||
      inputData.agent_name
    );
  }

  /**
   * Resolve expression with variables ({{$json.field}}, {{$node["Name"].json}})
   */
  private resolveExpression(expression: any, inputData: any): any {
    if (typeof expression !== "string") return expression;

    // Replace {{$json.field}} with actual values
    let resolved = expression.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      path = path.trim();

      // $json refers to current input
      if (path.startsWith("$json")) {
        const field = path.substring(6); // Remove "$json."
        return this.getNestedValue(inputData, field);
      }

      // $input refers to current input (alias)
      if (path.startsWith("$input")) {
        const field = path.substring(7); // Remove "$input."
        return this.getNestedValue(inputData, field);
      }

      // $node["NodeName"].json refers to specific node output
      if (path.startsWith("$node")) {
        const nodeMatch = path.match(/\$node\["([^"]+)"\]\.json\.?(.*)/);
        if (nodeMatch) {
          const nodeName = nodeMatch[1];
          const field = nodeMatch[2];

          // Find node by name
          const node = Array.from(this.context.nodes.values()).find(
            n => n.data.label === nodeName
          );
          if (node) {
            const nodeOutput = this.context.nodeOutputs.get(node.id);
            return field ? this.getNestedValue(nodeOutput, field) : nodeOutput;
          }
        }
      }

      // $vars refers to global variables
      if (path.startsWith("$vars")) {
        const field = path.substring(6); // Remove "$vars."
        return this.context.variables.get(field);
      }

      return match; // Return original if not resolved
    });

    return resolved;
  }

  /**
   * Resolve object with expressions
   */
  private resolveObject(
    obj: Record<string, any>,
    inputData: any
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = this.resolveExpression(value, inputData);
    }

    return resolved;
  }

  /**
   * Get nested value from object (e.g., "user.name")
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path || path === ".") return obj;

    const keys = path.split(".").filter(k => k);
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

/**
 * Execute workflow by ID
 */
export async function executeWorkflow(
  workflowId: number,
  triggerData?: any,
  triggeredBy?: number
) {
  // Load workflow from database
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [workflow] = await db
    .select()
    .from(visualFlows)
    .where(eq(visualFlows.id, workflowId));

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  const flowData = JSON.parse(workflow.flowData);
  const nodes = flowData.nodes || [];
  const edges = flowData.edges || [];

  // Create executor and run
  const executor = new WorkflowExecutor(workflowId, nodes, edges, triggerData);
  return await executor.execute(triggeredBy);
}
