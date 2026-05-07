import React, { useState } from 'react';
import { Node } from 'reactflow';
import { 
  Settings, Database, Play, TestTube, Save, X, Plus, Trash2, 
  Slider, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowNode, ConfigField, getNodeType } from './node-types';

interface NodeConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export default function NodeConfigPanel({ node, onClose, onUpdateNode }: NodeConfigPanelProps) {
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return <div className="p-4">Nó não encontrado</div>;

  const [activeTab, setActiveTab] = useState('geral');
  const [configValues, setConfigValues] = useState<Record<string, any>>(
    node.data?.configValues || {}
  );

  const handleConfigChange = (key: string, value: any) => {
    const newValues = { ...configValues, [key]: value };
    setConfigValues(newValues);
    onUpdateNode(node.id, { ...node.data, configValues: newValues });
  };

  const renderConfigField = (field: ConfigField) => {
    const value = configValues[field.key] ?? field.defaultValue ?? '';
    switch (field.type) {
      case 'string':
      case 'password':
        return (
          <Input
            type={field.type === 'password' ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleConfigChange(field.key, parseFloat(e.target.value))}
            className="mt-1"
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleConfigChange(field.key, e.target.checked)}
            />
            <span className="text-sm">Ativar</span>
          </label>
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleConfigChange(field.key, val)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'json':
      case 'prompt':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              let val: any = e.target.value;
              if (field.type === 'json') {
                try { val = JSON.parse(val); } catch {}
              }
              handleConfigChange(field.key, val);
            }}
            placeholder={field.placeholder}
            className="mt-1 h-24 text-sm font-mono"
          />
        );
      default:
        return <div className="text-sm text-gray-500">Campo não suportado</div>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: nodeDef.color }}
          />
          <h3 className="font-semibold text-sm">{nodeDef.label}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-4 mt-2">
          <TabsTrigger value="geral" className="text-xs">
            <Settings size={14} className="mr-1" /> Geral
          </TabsTrigger>
          <TabsTrigger value="dados" className="text-xs">
            <Database size={14} className="mr-1" /> Dados
          </TabsTrigger>
          <TabsTrigger value="execucao" className="text-xs">
            <Play size={14} className="mr-1" /> Execução
          </TabsTrigger>
          <TabsTrigger value="teste" className="text-xs">
            <TestTube size={14} className="mr-1" /> Teste
          </TabsTrigger>
        </TabsList>

        {/* Geral */}
        <TabsContent value="geral" className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <Label>Nome do Nó</Label>
            <Input 
              value={node.data?.label || ''} 
              onChange={(e) => onUpdateNode(node.id, { ...node.data, label: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <p className="text-xs text-gray-500 mt-1">{nodeDef.description}</p>
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="w-6 h-6 rounded border" 
                style={{ backgroundColor: nodeDef.color }}
              />
              <span className="text-xs text-gray-600">{nodeDef.color}</span>
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Badge style={{ backgroundColor: nodeDef.color + '20', color: nodeDef.color }}>
              {nodeDef.category}
            </Badge>
          </div>
        </TabsContent>

        {/* Dados (Configurações) */}
        <TabsContent value="dados" className="flex-1 overflow-y-auto p-4 space-y-4">
          <h4 className="text-sm font-medium">Configurações do Nó</h4>
          {nodeDef.config && nodeDef.config.length > 0 ? (
            nodeDef.config.map(field => (
              <div key={field.key}>
                <Label className="text-xs">{field.label}</Label>
                {renderConfigField(field)}
                {field.placeholder && (
                  <p className="text-xs text-gray-400 mt-1">Ex: {field.placeholder}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Este nó não possui configurações.</p>
          )}
        </TabsContent>

        {/* Execução */}
        <TabsContent value="execucao" className="flex-1 overflow-y-auto p-4 space-y-4">
          <h4 className="text-sm font-medium">Configurações de Execução</h4>
          <div>
            <Label>Retry Policy (tentativas)</Label>
            <Input type="number" defaultValue={3} className="mt-1" />
          </div>
          <div>
            <Label>Timeout (segundos)</Label>
            <Input type="number" defaultValue={30} className="mt-1" />
          </div>
          <div>
            <Label>Log Level</Label>
            <Select defaultValue="info">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Teste */}
        <TabsContent value="teste" className="flex-1 overflow-y-auto p-4 space-y-4">
          <h4 className="text-sm font-medium">Testar Nó</h4>
          <p className="text-xs text-gray-500">
            Simule a execução deste nó com dados de entrada.
          </p>
          <div>
            <Label>Dados de Entrada (JSON)</Label>
            <Textarea 
              placeholder='{"message": "Olá, preciso de remédios"}' 
              className="mt-1 h-24 text-sm font-mono"
            />
          </div>
          <Button className="w-full" size="sm">
            <TestTube size={14} className="mr-2" />
            Executar Teste
          </Button>
          <div className="bg-gray-50 p-3 rounded-md">
            <Label className="text-xs">Resultado</Label>
            <pre className="text-xs mt-1 text-gray-600">Clique em "Executar Teste"</pre>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={() => {
            // Save config to node data
            onUpdateNode(node.id, { ...node.data, configValues });
          }}
          className="w-full" 
          size="sm"
        >
          <Save size={14} className="mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
