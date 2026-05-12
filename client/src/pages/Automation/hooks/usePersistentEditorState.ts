import { useState, useCallback, useRef, useEffect } from 'react';
import { isFeatureEnabled } from '../features';

export interface EditorUIState {
  sidebarOpen: boolean;
  selectedNodeId: string | null;
  expandedCategories: Record<string, boolean>;
  searchTerm: string;
  configPanelOpen: boolean;
  activeConfigTab: string;
}

const DEFAULT_STATE: EditorUIState = {
  sidebarOpen: true,
  selectedNodeId: null,
  expandedCategories: {},
  searchTerm: '',
  configPanelOpen: false,
  activeConfigTab: 'geral',
};

const STORAGE_KEY = 'farma-francing-editor-ui-state';

function loadState(): EditorUIState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_STATE;
}

function saveState(state: EditorUIState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

/**
 * Hook que mantém o estado da UI do editor persistente entre trocas de nó.
 * Controlado pela feature flag PERSISTENT_STATE.
 */
export function usePersistentEditorState() {
  const [state, setState] = useState<EditorUIState>(loadState);
  const isPersistent = isFeatureEnabled('PERSISTENT_STATE');

  // Salva no localStorage sempre que muda (só se feature ativa)
  useEffect(() => {
    if (isPersistent) {
      saveState(state);
    }
  }, [state, isPersistent]);

  const setSidebarOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, sidebarOpen: open }));
  }, []);

  const setSelectedNodeId = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: id,
      configPanelOpen: id !== null,
    }));
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setState(prev => ({
      ...prev,
      expandedCategories: {
        ...prev.expandedCategories,
        [catId]: !prev.expandedCategories[catId],
      },
    }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setConfigPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, configPanelOpen: open }));
  }, []);

  const setActiveConfigTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeConfigTab: tab }));
  }, []);

  const resetState = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...state,
    isPersistent,
    setSidebarOpen,
    setSelectedNodeId,
    toggleCategory,
    setSearchTerm,
    setConfigPanelOpen,
    setActiveConfigTab,
    resetState,
  };
}
