import { useReducer, useCallback } from "react";
import { Node } from "reactflow";
import {
  FlowState,
  FlowAction,
} from "../types";

const initialState: FlowState = {
  selectedFlowId: null,
  isCreating: false,
  isImporting: false,
  importFile: null,
  importLoading: false,
  importProgress: 0,
  selectedNode: null,
  isConfigOpen: false,
  newFlowName: "",
  newFlowDescription: "",
};

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SET_SELECTED_FLOW":
      return { ...state, selectedFlowId: action.payload };
    case "SET_CREATING":
      return { ...state, isCreating: action.payload };
    case "SET_IMPORTING":
      return { ...state, isImporting: action.payload };
    case "SET_IMPORT_FILE":
      return { ...state, importFile: action.payload };
    case "SET_IMPORT_LOADING":
      return { ...state, importLoading: action.payload };
    case "SET_IMPORT_PROGRESS":
      return { ...state, importProgress: action.payload };
    case "SET_SELECTED_NODE":
      return { ...state, selectedNode: action.payload };
    case "SET_CONFIG_OPEN":
      return { ...state, isConfigOpen: action.payload };
    case "SET_NEW_FLOW_NAME":
      return { ...state, newFlowName: action.payload };
    case "SET_NEW_FLOW_DESCRIPTION":
      return { ...state, newFlowDescription: action.payload };
    case "RESET_IMPORT":
      return {
        ...state,
        isImporting: false,
        importFile: null,
        importLoading: false,
        importProgress: 0,
      };
    default:
      return state;
  }
}

export function useFlowState() {
  const [state, dispatch] = useReducer(flowReducer, initialState);

  // Actions
  const setSelectedFlowId = useCallback((id: number | null) => {
    dispatch({ type: "SET_SELECTED_FLOW", payload: id });
  }, []);

  const setIsCreating = useCallback((value: boolean) => {
    dispatch({ type: "SET_CREATING", payload: value });
  }, []);

  const setIsImporting = useCallback((value: boolean) => {
    dispatch({ type: "SET_IMPORTING", payload: value });
  }, []);

  const setImportFile = useCallback((file: File | null) => {
    dispatch({ type: "SET_IMPORT_FILE", payload: file });
  }, []);

  const setImportLoading = useCallback((value: boolean) => {
    dispatch({ type: "SET_IMPORT_LOADING", payload: value });
  }, []);

  const setImportProgress = useCallback((progress: number) => {
    dispatch({ type: "SET_IMPORT_PROGRESS", payload: progress });
  }, []);

  const setSelectedNode = useCallback((node: Node | null) => {
    dispatch({ type: "SET_SELECTED_NODE", payload: node });
  }, []);

  const setIsConfigOpen = useCallback((value: boolean) => {
    dispatch({ type: "SET_CONFIG_OPEN", payload: value });
  }, []);

  const setNewFlowName = useCallback((name: string) => {
    dispatch({ type: "SET_NEW_FLOW_NAME", payload: name });
  }, []);

  const setNewFlowDescription = useCallback((description: string) => {
    dispatch({ type: "SET_NEW_FLOW_DESCRIPTION", payload: description });
  }, []);

  const resetImport = useCallback(() => {
    dispatch({ type: "RESET_IMPORT" });
  }, []);

  const openNodeConfig = useCallback((node: Node) => {
    setSelectedNode(node);
    setIsConfigOpen(true);
  }, []);

  const closeNodeConfig = useCallback(() => {
    setIsConfigOpen(false);
    setSelectedNode(null);
  }, []);

  return {
    state,
    actions: {
      setSelectedFlowId,
      setIsCreating,
      setIsImporting,
      setImportFile,
      setImportLoading,
      setImportProgress,
      setSelectedNode,
      setIsConfigOpen,
      setNewFlowName,
      setNewFlowDescription,
      resetImport,
      openNodeConfig,
      closeNodeConfig,
    },
  };
}
