import React, { useState, useRef, useEffect } from 'react';
import { Node } from 'reactflow';
import { isFeatureEnabled } from '../features';

interface InlineNodeEditorProps {
  node: Node;
  onSave: (nodeId: string, newLabel: string) => void;
  onCancel: () => void;
}

/**
 * Editor inline para renomear nós diretamente no canvas.
 * Ao pressionar Enter, salva. Escape cancela.
 * Controlado pela feature flag INLINE_EDIT.
 */
export function InlineNodeEditor({ node, onSave, onCancel }: InlineNodeEditorProps) {
  if (!isFeatureEnabled('INLINE_EDIT')) return null;

  const [value, setValue] = useState(node.data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(node.id, value.trim() || node.data?.label || '');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(node.id, value.trim() || node.data?.label || '')}
      className="absolute z-50 bg-white border-2 border-blue-500 rounded px-2 py-0.5 text-sm font-medium text-gray-800 shadow-sm outline-none"
      style={{
        minWidth: '120px',
        maxWidth: '200px',
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}
