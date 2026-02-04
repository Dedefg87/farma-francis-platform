import React, { useState, useRef, useEffect } from 'react';
import { CONTEXT_VARIABLES, getVariableSuggestions, type IContextVariable } from '@/lib/variables';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Info, Lightbulb } from 'lucide-react';

interface VariableEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  showHelp?: boolean;
}

export function VariableEditor({ 
  value, 
  onChange, 
  placeholder = 'Digite seu texto... Use {{variavel}} para inserir variáveis',
  rows = 4,
  showHelp = true 
}: VariableEditorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<IContextVariable[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Detectar se está digitando uma variável
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const match = textBeforeCursor.match(/\{\{([^}]*)$/);
    
    if (match) {
      const prefix = match[1];
      const filtered = getVariableSuggestions(prefix);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertVariable = (variable: IContextVariable) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Remover {{ parcial se existir
    const cleanBefore = textBeforeCursor.replace(/\{\{[^}]*$/, '');
    
    const newValue = `${cleanBefore}{{${variable.name}}}${textAfterCursor}`;
    onChange(newValue);
    setShowSuggestions(false);

    // Reposicionar cursor após a variável inserida
    setTimeout(() => {
      const newPos = cleanBefore.length + variable.name.length + 4;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-sm"
        />
        
        {showSuggestions && (
          <Card className="absolute z-50 mt-1 max-h-64 w-full overflow-auto p-2 shadow-lg">
            <div className="space-y-1">
              {suggestions.map((variable) => (
                <button
                  key={variable.name}
                  onClick={() => insertVariable(variable)}
                  className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-primary">{variable.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {variable.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exemplo: <span className="font-mono">{variable.example}</span>
                  </p>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {showHelp && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p>Use <code className="bg-muted px-1 rounded">{'{{variavel}}'}</code> para inserir variáveis dinâmicas.</p>
              <p className="mt-1">Digite <code className="bg-muted px-1 rounded">{'{{'}</code> para ver sugestões.</p>
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-primary flex items-center gap-2 hover:underline">
              <Lightbulb className="h-4 w-4" />
              Ver todas as variáveis disponíveis
            </summary>
            <div className="mt-2 space-y-3 pl-6">
              {['cliente', 'ticket', 'mensagem', 'agente', 'sistema'].map((category) => (
                <div key={category}>
                  <h4 className="font-semibold text-foreground mb-1 capitalize">{category}</h4>
                  <div className="space-y-1">
                    {CONTEXT_VARIABLES
                      .filter(v => v.category === category)
                      .map(v => (
                        <div key={v.name} className="flex items-start gap-2">
                          <code className="bg-muted px-1 rounded text-primary flex-shrink-0">
                            {`{{${v.name}}}`}
                          </code>
                          <span className="text-muted-foreground">{v.description}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para visualizar variáveis em um texto
 */
interface VariablePreviewProps {
  template: string;
  context: Record<string, any>;
}

export function VariablePreview({ template, context }: VariablePreviewProps) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    // Importar dinamicamente para evitar problemas de SSR
    import('@/lib/variables').then(({ replaceVariables }) => {
      setPreview(replaceVariables(template, context));
    });
  }, [template, context]);

  if (!preview || preview === template) return null;

  return (
    <Card className="p-3 bg-muted/50">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground mb-1">Pré-visualização:</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{preview}</p>
        </div>
      </div>
    </Card>
  );
}
