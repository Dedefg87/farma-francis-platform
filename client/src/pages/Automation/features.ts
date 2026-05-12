// Feature Flags — Editor de Automação
// Cada flag controla uma melhoria UX. Após 1 semana estável, remover o flag e manter o código.

export const FEATURES = {
  // Fase 1 — Alto Impacto
  INLINE_EDIT: import.meta.env.VITE_FEATURE_INLINE_EDIT === 'true',
  FLOATING_PANEL: import.meta.env.VITE_FEATURE_FLOATING_PANEL === 'true',
  ERROR_INDICATOR: import.meta.env.VITE_FEATURE_ERROR_INDICATOR === 'true',
  PERSISTENT_STATE: import.meta.env.VITE_FEATURE_PERSISTENT_STATE === 'true',

  // Fase 2 — Navegação
  HOVER_PREVIEW: import.meta.env.VITE_FEATURE_HOVER_PREVIEW === 'true',
  AUTOSCROLL: import.meta.env.VITE_FEATURE_AUTOSCROLL === 'true',
  MINIMAP_ENHANCED: import.meta.env.VITE_FEATURE_MINIMAP_ENHANCED === 'true',
  FULL_CANVAS: import.meta.env.VITE_FEATURE_FULL_CANVAS === 'true',

  // Fase 3 — Organização Avançada
  ANALYZE_MODE: import.meta.env.VITE_FEATURE_ANALYZE_MODE === 'true',
  NODE_GROUPS: import.meta.env.VITE_FEATURE_NODE_GROUPS === 'true',
} as const;

// Helper para verificar se uma feature está ativa
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}
