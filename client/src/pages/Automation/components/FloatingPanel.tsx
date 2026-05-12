import React, { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { Edit, Copy, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { getNodeType } from '../node-types';
import { isFeatureEnabled } from '../features';

interface FloatingPanelProps {
  node: Node;
  position: { x: number; y: number };
  onEdit: (node: Node) => void;
  onDuplicate: (node: Node) => void;
  onDelete: (node: Node) => void;
  onClose: () => void;
}

/**
 * Mini painel flutuante que aparece ao clicar em um nó.
 * Oferece ações rápidas: editar, duplicar, remover.
 * Controlado pela feature flag FLOATING_PANEL.
 */
export function FloatingPanel({
  node,
  position,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: FloatingPanelProps) {
  if (!isFeatureEnabled('FLOATING_PANEL')) return null;

  const nodeDef = getNodeType(node.data?.nodeType);
  const hasErrors = nodeDef?.errors?.some(e => e.severity === 'error');
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 px-1 flex items-center gap-1 animate-in fade-in duration-150"
      style={{
        left: position.x,
        top: position.y - 40,
        transform: 'translateX(-50%)',
      }}
    >
      <button
        onClick={() => onEdit(node)}
        className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
        title="Editar nó"
      >
        <Edit size={14} />
      </button>
      <button
        onClick={() => onDuplicate(node)}
        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
        title="Duplicar nó"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={() => onDelete(node)}
        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
        title="Remover nó"
      >
        <Trash2 size={14} />
      </button>
      {hasErrors && (
        <div className="p-1.5 text-red-500" title="Nó com erros">
          <AlertTriangle size={14} />
        </div>
      )}
      {!hasErrors && nodeDef && (
        <div className="p-1.5 text-green-500" title="Nó válido">
          <CheckCircle size={14} />
        </div>
      )}
    </div>
  );
}
