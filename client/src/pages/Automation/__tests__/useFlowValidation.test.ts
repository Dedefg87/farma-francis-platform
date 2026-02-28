import { describe, it, expect } from "vitest";
import { useFlowValidation } from "../hooks/useFlowValidation";

describe("useFlowValidation", () => {
  const { validateNode, validateConnections, validateFlow, validateBeforeSave } = useFlowValidation();

  describe("validateNode", () => {
    it("deve retornar erro para nó sem label", () => {
      const node = {
        id: "node-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: {},
      };

      const result = validateNode(node as any);

      expect(result.errors).toContain("Nó sem label");
    });

    it("deve retornar erro para nó de mensagem sem texto", () => {
      const node = {
        id: "node-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Mensagem", config: {} },
      };

      const result = validateNode(node as any);

      expect(result.errors).toContain("Nó de mensagem sem texto configurado");
    });

    it("deve retornar erro para nó de condição sem regra", () => {
      const node = {
        id: "node-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Condição Teste", config: {} },
      };

      const result = validateNode(node as any);

      expect(result.errors).toContain("Nó de condição sem regra definida");
    });

    it("deve retornar warning para nó de espera sem timeout", () => {
      const node = {
        id: "node-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Aguardar Resposta", config: {} },
      };

      const result = validateNode(node as any);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("deve retornar válido para nó completo", () => {
      const node = {
        id: "node-1",
        type: "default",
        position: { x: 0, y: 0 },
        data: {
          label: "Mensagem",
          config: { message: "Olá!" },
        },
      };

      const result = validateNode(node as any);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateConnections", () => {
    it("deve retornar erro para conexão com nó inexistente", () => {
      const nodes = [
        { id: "node-1", type: "default", position: { x: 0, y: 0 }, data: {} },
      ];
      const edges = [
        { id: "edge-1", source: "node-1", target: "node-2" },
      ];

      const errors = validateConnections(nodes as any, edges as any);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("deve retornar vazio para conexões válidas", () => {
      const nodes = [
        { id: "node-1", type: "default", position: { x: 0, y: 0 }, data: {} },
        { id: "node-2", type: "default", position: { x: 100, y: 0 }, data: {} },
      ];
      const edges = [
        { id: "edge-1", source: "node-1", target: "node-2" },
      ];

      const errors = validateConnections(nodes as any, edges as any);

      expect(errors).toHaveLength(0);
    });
  });

  describe("validateFlow", () => {
    it("deve retornar warning para fluxo vazio", () => {
      const result = validateFlow([], []);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Fluxo vazio - adicione nós para criar o fluxo");
    });

    it("deve retornar warning para fluxo sem trigger", () => {
      const nodes = [
        { id: "node-1", type: "default", position: { x: 0, y: 0 }, data: { label: "Mensagem" } },
      ];
      const edges: any[] = [];

      const result = validateFlow(nodes as any, edges);

      expect(result.warnings.some(w => w.includes("trigger"))).toBe(true);
    });

    it("deve retornar válido para fluxo com trigger", () => {
      const nodes = [
        { id: "trigger-1", type: "default", position: { x: 0, y: 0 }, data: { label: "📩 Trigger", config: { event: "message" } } },
        { id: "msg-1", type: "default", position: { x: 200, y: 0 }, data: { label: "Enviar Texto", config: {} } },
      ];
      const edges = [
        { id: "edge-1", source: "trigger-1", target: "msg-1" },
      ];

      const result = validateFlow(nodes as any, edges as any);

      expect(result.errors).toHaveLength(0);
    });

    it("deve detectar erros em nós com configuração incompleta", () => {
      const nodes = [
        { id: "node-1", type: "default", position: { x: 0, y: 0 }, data: { label: "Mensagem", config: {} } },
      ];
      const edges: any[] = [];

      const result = validateFlow(nodes as any, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateBeforeSave", () => {
    it("deve impedir salvamento com erros", () => {
      const nodes = [
        { id: "node-1", type: "default", position: { x: 0, y: 0 }, data: { label: "Mensagem", config: {} } },
      ];
      const edges: any[] = [];

      const result = validateBeforeSave(nodes as any, edges);

      expect(result.canSave).toBe(false);
      expect(result.message).toContain("Erros encontrados");
    });

    it("deve permitir salvamento com warnings", () => {
      const nodes = [
        { id: "trigger-1", type: "default", position: { x: 0, y: 0 }, data: { label: "Aguardar", config: {} } },
      ];
      const edges: any[] = [];

      const result = validateBeforeSave(nodes as any, edges);

      expect(result.canSave).toBe(true);
      expect(result.message).toContain("Avisos");
    });

    it("deve permitir salvamento para fluxo válido", () => {
      const nodes = [
        { id: "trigger-1", type: "default", position: { x: 0, y: 0 }, data: { label: "📩 Trigger", config: { event: "test" } } },
        { id: "msg-1", type: "default", position: { x: 200, y: 0 }, data: { label: "Mensagem", config: { message: "Teste" } } },
      ];
      const edges = [
        { id: "edge-1", source: "trigger-1", target: "msg-1" },
      ];

      const result = validateBeforeSave(nodes as any, edges as any);

      expect(result.canSave).toBe(true);
      expect(result.message).toBe("Fluxo válido!");
    });
  });
});
