import React, { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight, GripVertical,
  FileCheck, Brain, Heart, Package, MessageSquare, ShieldCheck,
  Calendar, Tag, DollarSign, Truck, UserPlus, Award, ScanLine, Thermometer,
  Stethoscope, Pill, AlertTriangle, Bot, ClipboardCheck, RefreshCw,
  Store, Video, ShoppingBag, Calculator, Megaphone, Shield, Clipboard,
  BarChart, DollarSign as DollarIcon, Eye, Receipt as ReceiptIcon, CreditCard as CreditCardIcon,
  Landmark, Building, CreditCard as CreditCard2, Wallet, PiggyBank,
  ShoppingBasket, Utensils, Truck as Truck2, Mail as Mail2,
  LineChart, Megaphone as Megaphone2, Radio, MonitorSpeaker, Volume2,
  Zap, GitBranch, Code, Database, Globe
} from 'lucide-react';
import {
  CATEGORIES, NODE_TYPES, getNodesByCategory
} from './node-types';
import { WorkflowNode } from './node-types';

// Map category id to icon component
const categoryIcons: Record<string, React.ComponentType> = {
  'entrada': FileCheck,
  'ia': Brain,
  'saude': Heart,
  'erp': Package,
  'comunicacao': MessageSquare,
  'compliance': ShieldCheck,
  'agenda': Calendar,
  'marketing': Tag,
  'financeiro': DollarSign,
  'logistica': Truck,
  'crm': UserPlus,
  'iot': Thermometer,
  'fiscal': ReceiptIcon,
  'beneficios': CreditCardIcon,
  'atendimento_ia': Bot,
  'estoque_seg': ClipboardCheck,
  'automacao_proc': RefreshCw,
  'ecommerce': Store,
  'telemedicina': Video,
  'marketing_ia': ShoppingBag,
  'financeiro_erp': Calculator,
  'comunicacao_mkt': Megaphone,
  'compliance_anvisa': Shield,
  'saude_ia': Clipboard,
  'analytics': BarChart,
  'pagamentos': DollarIcon,
  'ia_compliance': Eye,
  'core_triggers': Zap,
  'core_logic': GitBranch,
  'core_actions': Code,
  'core_data': Database,
  'integrations': Globe,
  'ai_generic': Brain,
  'payments': CreditCardIcon,
  'integrations_br': Landmark,
  'delivery_br': ShoppingBasket,
  'fiscal_br': Building,
  'marketing_br': Megaphone2,
  'erp_br': LineChart,
};

interface NodeSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: WorkflowNode) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function NodeSidebar({ onDragStart, isOpen, onToggle }: NodeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  const toggleCategory = (catId: string) => setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return NODE_TYPES;
    const term = searchTerm.toLowerCase();
    return NODE_TYPES.filter(node =>
      node.label.toLowerCase().includes(term) ||
      node.description.toLowerCase().includes(term) ||
      node.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const nodesByCategory = useMemo(() => {
    const grouped: Record<string, WorkflowNode[]> = {};
    filteredNodes.forEach(node => {
      if (!grouped[node.category]) grouped[node.category] = [];
      grouped[node.category].push(node);
    });
    return grouped;
  }, [filteredNodes]);

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isOpen ? 'w-64' : 'w-12'} flex flex-col h-full`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        {isOpen && <h3 className="font-semibold text-gray-800 text-sm">Adicionar Nó</h3>}
        <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
          {isOpen ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nó..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {filteredNodes.length} nós em {CATEGORIES.length} categorias
            </div>
          </div>

          {/* Node List */}
          <div className="flex-1 overflow-y-auto">
            {CATEGORIES.map(category => {
              const nodes = nodesByCategory[category.id] || [];
              if (nodes.length === 0) return null;
              const isExpanded = expandedCategories[category.id];
              const CategoryIcon = categoryIcons[category.id] || FileCheck;
              return (
                <div key={category.id} className="border-b border-gray-100">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{category.label}</span>
                      <span className="text-xs text-gray-400">({nodes.length})</span>
                    </div>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isExpanded && (
                    <div className="pb-2">
                      {nodes.map(node => {
                        const NodeIcon = node.icon;
                        return (
                          <div
                            key={node.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, node)}
                            className="flex items-center gap-2 p-2 mx-2 mb-1 rounded-md cursor-grab hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
                            style={{ borderLeft: `4px solid ${node.color}` }}
                          >
                            <GripVertical size={14} className="text-gray-400" />
                            <NodeIcon size={16} style={{ color: node.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{node.label}</div>
                              <div className="text-xs text-gray-500 truncate">{node.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
