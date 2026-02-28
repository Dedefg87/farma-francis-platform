import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlowState } from "../hooks/useFlowState";

describe("useFlowState", () => {
  it("deve iniciar com estado padrão", () => {
    const { result } = renderHook(() => useFlowState());

    expect(result.current.state.selectedFlowId).toBe(null);
    expect(result.current.state.isCreating).toBe(false);
    expect(result.current.state.isImporting).toBe(false);
    expect(result.current.state.selectedNode).toBe(null);
    expect(result.current.state.isConfigOpen).toBe(false);
    expect(result.current.state.newFlowName).toBe("");
    expect(result.current.state.newFlowDescription).toBe("");
    expect(result.current.state.validationResult).toBe(null);
    expect(result.current.state.showValidationDialog).toBe(false);
  });

  it("deve atualizar selectedFlowId", () => {
    const { result } = renderHook(() => useFlowState());

    act(() => {
      result.current.actions.setSelectedFlowId(123);
    });

    expect(result.current.state.selectedFlowId).toBe(123);
  });

  it("deve atualizar isCreating", () => {
    const { result } = renderHook(() => useFlowState());

    act(() => {
      result.current.actions.setIsCreating(true);
    });

    expect(result.current.state.isCreating).toBe(true);
  });

  it("deve atualizar newFlowName e newFlowDescription", () => {
    const { result } = renderHook(() => useFlowState());

    act(() => {
      result.current.actions.setNewFlowName("Meu Fluxo");
      result.current.actions.setNewFlowDescription("Descrição do fluxo");
    });

    expect(result.current.state.newFlowName).toBe("Meu Fluxo");
    expect(result.current.state.newFlowDescription).toBe("Descrição do fluxo");
  });

  it("deve resetar estado de import", () => {
    const { result } = renderHook(() => useFlowState());

    act(() => {
      result.current.actions.setIsImporting(true);
      result.current.actions.setImportProgress(50);
      result.current.actions.setImportLoading(true);
    });

    expect(result.current.state.isImporting).toBe(true);
    expect(result.current.state.importProgress).toBe(50);

    act(() => {
      result.current.actions.resetImport();
    });

    expect(result.current.state.isImporting).toBe(false);
    expect(result.current.state.importProgress).toBe(0);
    expect(result.current.state.importLoading).toBe(false);
  });

  it("deve abrir e fechar config de nó", () => {
    const { result } = renderHook(() => useFlowState());

    const mockNode = {
      id: "node-1",
      type: "default",
      position: { x: 0, y: 0 },
      data: { label: "Test Node" },
    };

    act(() => {
      result.current.actions.openNodeConfig(mockNode as any);
    });

    expect(result.current.state.selectedNode).toEqual(mockNode);
    expect(result.current.state.isConfigOpen).toBe(true);

    act(() => {
      result.current.actions.closeNodeConfig();
    });

    expect(result.current.state.selectedNode).toBe(null);
    expect(result.current.state.isConfigOpen).toBe(false);
  });

  it("deve mostrar validação com dados pendentes", () => {
    const { result } = renderHook(() => useFlowState());

    const validationResult = {
      isValid: false,
      errors: ["Erro 1", "Erro 2"],
      warnings: [],
    };

    const pendingData = {
      nodes: [{ id: "1", type: "default", position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    };

    act(() => {
      result.current.actions.showValidation(validationResult, pendingData as any);
    });

    expect(result.current.state.validationResult).toEqual(validationResult);
    expect(result.current.state.showValidationDialog).toBe(true);
    expect(result.current.state.pendingSaveData).toEqual(pendingData);
  });
});
