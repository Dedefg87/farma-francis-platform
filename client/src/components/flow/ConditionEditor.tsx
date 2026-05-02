import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Copy, Play } from 'lucide-react';
import { CONTEXT_VARIABLES } from '@/lib/variables';

export interface Condition {
  id: string;
  variable: string;
  operator: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: Condition[];
  groups?: ConditionGroup[];
}

interface ConditionEditorProps {
  value: ConditionGroup;
  onChange: (value: ConditionGroup) => void;
}

const OPERATORS = {
  string: [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' },
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'ends_with', label: 'Termina com' },
    { value: 'regex', label: 'Regex (expressão regular)' },
    { value: 'in_list', label: 'Está na lista' },
  ],
  number: [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' },
    { value: 'greater_than', label: 'Maior que' },
    { value: 'greater_or_equal', label: 'Maior ou igual a' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'less_or_equal', label: 'Menor ou igual a' },
    { value: 'between', label: 'Entre' },
  ],
  boolean: [
    { value: 'is_true', label: 'É verdadeiro' },
    { value: 'is_false', label: 'É falso' },
  ],
  date: [
    { value: 'equals', label: 'Igual a' },
    { value: 'before', label: 'Antes de' },
    { value: 'after', label: 'Depois de' },
    { value: 'between', label: 'Entre' },
    { value: 'last_n_days', label: 'Últimos N dias' },
  ],
};

export function ConditionEditor({ value, onChange }: ConditionEditorProps) {
  const [testContext, setTestContext] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      variable: '',
      operator: 'equals',
      value: '',
      type: 'string',
    };

    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  };

  const removeCondition = (id: string) => {
    onChange({
      ...value,
      conditions: value.conditions.filter(c => c.id !== id),
    });
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };

  const duplicateCondition = (condition: Condition) => {
    const newCondition = {
      ...condition,
      id: `condition-${Date.now()}`,
    };

    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  };

  const toggleGroupOperator = () => {
    onChange({
      ...value,
      operator: value.operator === 'AND' ? 'OR' : 'AND',
    });
  };

  const testConditions = () => {
    // Implementar lógica de teste real
    const result = evaluateConditionGroup(value, testContext);
    setTestResult(result);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Condições</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleGroupOperator}
            className="h-7"
          >
            {value.operator}
          </Button>
        </div>
        <Button onClick={addCondition} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Condição
        </Button>
      </div>

      {/* Lista de Condições */}
      <div className="space-y-2">
        {value.conditions.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            Nenhuma condição adicionada. Clique em "Adicionar Condição" para começar.
          </Card>
        ) : (
          value.conditions.map((condition, index) => (
            <Card key={condition.id} className="p-4">
              <div className="space-y-3">
                {/* Operador lógico entre condições */}
                {index > 0 && (
                  <div className="flex justify-center">
                    <Badge variant="secondary">{value.operator}</Badge>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2">
                  {/* Variável */}
                  <div className="col-span-4">
                    <Select
                      value={condition.variable}
                      onValueChange={(val) => {
                        const variable = CONTEXT_VARIABLES.find(v => v.name === val);
                        updateCondition(condition.id, {
                          variable: val,
                          type: variable?.type === 'string' ? 'string' :
                                variable?.type === 'number' ? 'number' :
                                variable?.type === 'boolean' ? 'boolean' :
                                variable?.type === 'date' ? 'date' : 'string',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione variável" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTEXT_VARIABLES.map((v) => (
                          <SelectItem key={v.name} value={v.name}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operador */}
                  <div className="col-span-3">
                    <Select
                      value={condition.operator}
                      onValueChange={(val) => updateCondition(condition.id, { operator: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS[condition.type].map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor */}
                  <div className="col-span-3">
                    <Input
                      placeholder="Valor"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      type={condition.type === 'number' ? 'number' : 'text'}
                    />
                  </div>

                  {/* Ações */}
                  <div className="col-span-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateCondition(condition)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(condition.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Testar Condições */}
      {value.conditions.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <h4 className="font-semibold text-sm mb-3">Testar Condições</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {value.conditions.map((condition) => (
                <div key={condition.id} className="space-y-1">
                  <Label className="text-xs">{condition.variable}</Label>
                  <Input
                    placeholder="Valor de teste"
                    size={1}
                    onChange={(e) => {
                      setTestContext({
                        ...testContext,
                        [condition.variable]: e.target.value,
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={testConditions} size="sm" className="flex-1">
                <Play className="h-4 w-4 mr-1" />
                Testar
              </Button>

              {testResult !== null && (
                <Badge variant={testResult ? 'default' : 'destructive'}>
                  {testResult ? '✓ Passou' : '✗ Falhou'}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Avalia um grupo de condições
 */
function evaluateConditionGroup(group: ConditionGroup, context: Record<string, any>): boolean {
  const results = group.conditions.map(condition => evaluateCondition(condition, context));

  if (group.operator === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

/**
 * Avalia uma condição individual
 */
function evaluateCondition(condition: Condition, context: Record<string, any>): boolean {
  const contextValue = getNestedValue(context, condition.variable);
  const { operator, value } = condition;

  switch (operator) {
    case 'equals':
      return contextValue == value;
    case 'not_equals':
      return contextValue != value;
    case 'contains':
      return String(contextValue).includes(value);
    case 'not_contains':
      return !String(contextValue).includes(value);
    case 'starts_with':
      return String(contextValue).startsWith(value);
    case 'ends_with':
      return String(contextValue).endsWith(value);
    case 'greater_than':
      return Number(contextValue) > Number(value);
    case 'less_than':
      return Number(contextValue) < Number(value);
    case 'is_true':
      return Boolean(contextValue);
    case 'is_false':
      return !Boolean(contextValue);
    default:
      return false;
  }
}

/**
 * Obtém valor aninhado de um objeto
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
