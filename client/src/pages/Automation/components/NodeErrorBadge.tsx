import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Node } from 'reactflow';
import { getNodeType } from '../node-types';
import { isFeatureEnabled } from '../features';

interface NodeErrorBadgeProps {
  node: Node;
}

/**
 * Badge de erro exibido no canto do nó.
 * Só renderiza se ERROR_INDICATOR estiver ativo e o nó tiver erros.
 */
export function NodeErrorBadge({ node }: NodeErrorBadgeProps) {
  if (!isFeatureEnabled('ERROR_INDICATOR')) return null;

  const nodeDef = getNodeType(node.data?.nodeType);
  const errors = nodeDef?.errors;
  if (!errors || errors.length === 0) return null;

  const errorCount = errors.length;
  const hasErrors = errors.some(e => e.severity === 'error');
  const hasWarnings = errors.some(e => e.severity === 'warning');

  const badgeColor = hasErrors
    ? 'bg-red-500 border-red-600'
    : 'bg-amber-500 border-amber-600';

  return (
    <div
      className={`absolute -top-2 -right-2 z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 border-white text-white text-[10px] font-bold shadow-sm ${badgeColor}`}
      title={errors.map(e => e.message).join('\n')}
    >
      {errorCount > 1 ? errorCount : <AlertTriangle size={10} />}
    </div>
  );
}

/**
 * Retorna classes CSS para borda do nó baseado em erros.
 */
export function getNodeErrorClasses(node: Node): string {
  if (!isFeatureEnabled('ERROR_INDICATOR')) return '';

  const nodeDef = getNodeType(node.data?.nodeType);
  const errors = nodeDef?.errors;
  if (!errors || errors.length === 0) return '';

  const hasErrors = errors.some(e => e.severity === 'error');
  if (hasErrors) {
    return 'ring-2 ring-red-400 ring-offset-1';
  }

  return 'ring-2 ring-amber-400 ring-offset-1';
}
