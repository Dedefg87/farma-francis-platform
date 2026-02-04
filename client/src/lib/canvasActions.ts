import { Node, Edge } from 'reactflow';

export interface CanvasAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: string;
  description: string;
  category: 'edit' | 'view' | 'organize' | 'debug';
}

/**
 * Catálogo de ações rápidas disponíveis no canvas
 */
export const CANVAS_ACTIONS: CanvasAction[] = [
  // Edição
  {
    id: 'copy',
    label: 'Copiar',
    shortcut: 'Ctrl+C',
    icon: 'Copy',
    description: 'Copiar nós selecionados',
    category: 'edit',
  },
  {
    id: 'paste',
    label: 'Colar',
    shortcut: 'Ctrl+V',
    icon: 'Clipboard',
    description: 'Colar nós copiados',
    category: 'edit',
  },
  {
    id: 'duplicate',
    label: 'Duplicar',
    shortcut: 'Ctrl+D',
    icon: 'Copy',
    description: 'Duplicar nós selecionados',
    category: 'edit',
  },
  {
    id: 'delete',
    label: 'Excluir',
    shortcut: 'Delete',
    icon: 'Trash2',
    description: 'Excluir nós selecionados',
    category: 'edit',
  },
  {
    id: 'undo',
    label: 'Desfazer',
    shortcut: 'Ctrl+Z',
    icon: 'Undo',
    description: 'Desfazer última ação',
    category: 'edit',
  },
  {
    id: 'redo',
    label: 'Refazer',
    shortcut: 'Ctrl+Y',
    icon: 'Redo',
    description: 'Refazer ação desfeita',
    category: 'edit',
  },

  // Visualização
  {
    id: 'zoomIn',
    label: 'Aumentar Zoom',
    shortcut: 'Ctrl++',
    icon: 'ZoomIn',
    description: 'Aumentar zoom do canvas',
    category: 'view',
  },
  {
    id: 'zoomOut',
    label: 'Diminuir Zoom',
    shortcut: 'Ctrl+-',
    icon: 'ZoomOut',
    description: 'Diminuir zoom do canvas',
    category: 'view',
  },
  {
    id: 'fitView',
    label: 'Ajustar Visualização',
    shortcut: 'Ctrl+0',
    icon: 'Maximize2',
    description: 'Ajustar todos os nós na tela',
    category: 'view',
  },

  // Organização
  {
    id: 'alignLeft',
    label: 'Alinhar à Esquerda',
    icon: 'AlignLeft',
    description: 'Alinhar nós selecionados à esquerda',
    category: 'organize',
  },
  {
    id: 'alignCenter',
    label: 'Alinhar ao Centro',
    icon: 'AlignCenter',
    description: 'Alinhar nós selecionados ao centro',
    category: 'organize',
  },
  {
    id: 'alignRight',
    label: 'Alinhar à Direita',
    icon: 'AlignRight',
    description: 'Alinhar nós selecionados à direita',
    category: 'organize',
  },
  {
    id: 'distributeHorizontal',
    label: 'Distribuir Horizontalmente',
    icon: 'AlignJustify',
    description: 'Distribuir nós uniformemente na horizontal',
    category: 'organize',
  },
  {
    id: 'distributeVertical',
    label: 'Distribuir Verticalmente',
    icon: 'AlignVerticalJustifyCenter',
    description: 'Distribuir nós uniformemente na vertical',
    category: 'organize',
  },

  // Debug
  {
    id: 'toggleDisabled',
    label: 'Habilitar/Desabilitar',
    shortcut: 'Ctrl+E',
    icon: 'Power',
    description: 'Habilitar ou desabilitar nó temporariamente',
    category: 'debug',
  },
  {
    id: 'addNote',
    label: 'Adicionar Nota',
    shortcut: 'Ctrl+N',
    icon: 'StickyNote',
    description: 'Adicionar nota/comentário ao nó',
    category: 'debug',
  },
  {
    id: 'changeColor',
    label: 'Mudar Cor',
    icon: 'Palette',
    description: 'Alterar cor do nó para organização',
    category: 'debug',
  },
];

/**
 * Histórico de ações para undo/redo
 */
export class ActionHistory {
  private history: Array<{ nodes: Node[]; edges: Edge[] }> = [];
  private currentIndex = -1;
  private maxSize = 50;

  push(nodes: Node[], edges: Edge[]) {
    // Remover ações futuras se estamos no meio do histórico
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Adicionar nova ação
    this.history.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    
    // Limitar tamanho do histórico
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): { nodes: Node[]; edges: Edge[] } | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    return this.history[this.currentIndex];
  }

  redo(): { nodes: Node[]; edges: Edge[] } | null {
    if (this.currentIndex >= this.history.length - 1) return null;
    this.currentIndex++;
    return this.history[this.currentIndex];
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}

/**
 * Utilitários para manipulação de nós
 */
export const NodeUtils = {
  /**
   * Duplica nós com offset de posição
   */
  duplicate(nodes: Node[], offset = 50): Node[] {
    return nodes.map(node => ({
      ...node,
      id: `${node.id}-copy-${Date.now()}`,
      position: {
        x: node.position.x + offset,
        y: node.position.y + offset,
      },
      selected: false,
    }));
  },

  /**
   * Alinha nós selecionados
   */
  align(nodes: Node[], direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): Node[] {
    if (nodes.length < 2) return nodes;

    const positions = nodes.map(n => n.position);
    let targetValue: number;

    switch (direction) {
      case 'left':
        targetValue = Math.min(...positions.map(p => p.x));
        return nodes.map(n => ({ ...n, position: { ...n.position, x: targetValue } }));
      
      case 'right':
        targetValue = Math.max(...positions.map(p => p.x));
        return nodes.map(n => ({ ...n, position: { ...n.position, x: targetValue } }));
      
      case 'center':
        const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        return nodes.map(n => ({ ...n, position: { ...n.position, x: avgX } }));
      
      case 'top':
        targetValue = Math.min(...positions.map(p => p.y));
        return nodes.map(n => ({ ...n, position: { ...n.position, y: targetValue } }));
      
      case 'bottom':
        targetValue = Math.max(...positions.map(p => p.y));
        return nodes.map(n => ({ ...n, position: { ...n.position, y: targetValue } }));
      
      case 'middle':
        const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        return nodes.map(n => ({ ...n, position: { ...n.position, y: avgY } }));
      
      default:
        return nodes;
    }
  },

  /**
   * Distribui nós uniformemente
   */
  distribute(nodes: Node[], direction: 'horizontal' | 'vertical'): Node[] {
    if (nodes.length < 3) return nodes;

    const sorted = [...nodes].sort((a, b) => 
      direction === 'horizontal' 
        ? a.position.x - b.position.x 
        : a.position.y - b.position.y
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = direction === 'horizontal'
      ? last.position.x - first.position.x
      : last.position.y - first.position.y;
    const spacing = totalSpace / (sorted.length - 1);

    return sorted.map((node, index) => ({
      ...node,
      position: {
        ...node.position,
        [direction === 'horizontal' ? 'x' : 'y']: 
          first.position[direction === 'horizontal' ? 'x' : 'y'] + (spacing * index),
      },
    }));
  },

  /**
   * Altera cor de um nó
   */
  changeColor(node: Node, color: string): Node {
    return {
      ...node,
      data: {
        ...node.data,
        color,
      },
      style: {
        ...node.style,
        borderColor: color,
      },
    };
  },

  /**
   * Adiciona nota a um nó
   */
  addNote(node: Node, note: string): Node {
    return {
      ...node,
      data: {
        ...node.data,
        note,
      },
    };
  },

  /**
   * Habilita/desabilita nó
   */
  toggleDisabled(node: Node): Node {
    return {
      ...node,
      data: {
        ...node.data,
        disabled: !node.data.disabled,
      },
      style: {
        ...node.style,
        opacity: node.data.disabled ? 1 : 0.5,
      },
    };
  },
};

/**
 * Cores disponíveis para organização visual
 */
export const NODE_COLORS = [
  { name: 'Padrão', value: '#3b82f6' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Amarelo', value: '#f59e0b' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cinza', value: '#6b7280' },
];
