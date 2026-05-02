import { useState, useEffect } from "react";
import { Node } from "reactflow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface N8NNodeConfigProps {
  node: Node | null;
  open: boolean;
  onClose: () => void;
  onSave: (nodeId: string, data: unknown) => void;
}

export default function N8NNodeConfig({
  node,
  open,
  onClose,
  onSave,
}: N8NNodeConfigProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "");
      setDescription(node.data.description || "");
      setConfig(node.data.config || {});
    }
  }, [node]);

  const handleSave = () => {
    if (!node) return;

    onSave(node.id, {
      ...node.data,
      label,
      description,
      config,
    });
    onClose();
  };

  const renderConfigFields = () => {
    if (!node) return null;

    const nodeType = node.data.nodeType || node.type;

    switch (nodeType) {
      case "message":
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de Mensagem</Label>
              <Select
                value={config.messageType || "text"}
                onValueChange={value =>
                  setConfig({ ...config, messageType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={config.content || ""}
                onChange={e =>
                  setConfig({ ...config, content: e.target.value })
                }
                placeholder="Digite a mensagem..."
                rows={4}
              />
            </div>
          </>
        );

      case "ai":
        return (
          <>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={config.model || "gpt-4"}
                onValueChange={value => setConfig({ ...config, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prompt do Sistema</Label>
              <Textarea
                value={config.systemPrompt || ""}
                onChange={e =>
                  setConfig({ ...config, systemPrompt: e.target.value })
                }
                placeholder="Você é um assistente útil..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Temperatura (0-1)</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature || 0.7}
                onChange={e =>
                  setConfig({
                    ...config,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </>
        );

      case "condition":
        const conditionType = config.condition || config.type || "if_else";

        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de Condição</Label>
              <Select
                value={conditionType}
                onValueChange={value =>
                  setConfig({ ...config, condition: value, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="if_else">
                    If/Else (Personalizado)
                  </SelectItem>
                  <SelectItem value="working_hours">
                    Horário Comercial
                  </SelectItem>
                  <SelectItem value="agent_logged_in">Agente Logado</SelectItem>
                  <SelectItem value="close_reason == ">
                    Motivo de Fechamento
                  </SelectItem>
                  <SelectItem value="day_of_week">Dia da Semana</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {conditionType === "working_hours" && (
              <div className="space-y-4 mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Horário Segunda a Sábado</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={config.schedule?.mon_sat?.start || "08:00"}
                      onChange={e =>
                        setConfig({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            mon_sat: {
                              ...config.schedule?.mon_sat,
                              start: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={config.schedule?.mon_sat?.end || "19:40"}
                      onChange={e =>
                        setConfig({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            mon_sat: {
                              ...config.schedule?.mon_sat,
                              end: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <h4 className="font-medium mt-4">
                  Horário Domingos e Feriados
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={config.schedule?.sun_holiday?.start || "08:00"}
                      onChange={e =>
                        setConfig({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            sun_holiday: {
                              ...config.schedule?.sun_holiday,
                              start: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={config.schedule?.sun_holiday?.end || "11:40"}
                      onChange={e =>
                        setConfig({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            sun_holiday: {
                              ...config.schedule?.sun_holiday,
                              end: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {conditionType === "agent_logged_in" && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Esta condição verifica se há um agente disponível para
                  atender.
                  <br />
                  Retorna <strong>Sim</strong> se houver agente logado.
                  <br />
                  Retorna <strong>Não</strong> se não houver agente disponível.
                </p>
              </div>
            )}

            {(conditionType === "if_else" || conditionType === "variable") && (
              <div className="space-y-2 mt-4">
                <Label>Expressão</Label>
                <Input
                  value={config.condition || ""}
                  onChange={e =>
                    setConfig({ ...config, condition: e.target.value })
                  }
                  placeholder='Ex: {{customer.status}} == "vip"'
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis como &#123;&#123;customer.name&#125;&#125;,
                  &#123;&#123;agent_name&#125;&#125;,
                  &#123;&#123;message.text&#125;&#125;
                </p>
              </div>
            )}
          </>
        );

      case "transfer":
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de Transferência</Label>
              <Select
                value={config.transferType || "available"}
                onValueChange={value =>
                  setConfig({ ...config, transferType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Agente Disponível</SelectItem>
                  <SelectItem value="department">Departamento</SelectItem>
                  <SelectItem value="specific_agent">
                    Agente Específico
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={config.priority || "medium"}
                onValueChange={value =>
                  setConfig({ ...config, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "wait":
      case "delay":
        return (
          <>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Input
                type="number"
                value={config.duration || 5}
                onChange={e =>
                  setConfig({ ...config, duration: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={config.unit || "seconds"}
                onValueChange={value => setConfig({ ...config, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Segundos</SelectItem>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "api":
        return (
          <>
            <div className="space-y-2">
              <Label>Método HTTP</Label>
              <Select
                value={config.method || "GET"}
                onValueChange={value => setConfig({ ...config, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={config.url || ""}
                onChange={e => setConfig({ ...config, url: e.target.value })}
                placeholder="https://api.exemplo.com/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={config.body || ""}
                onChange={e => setConfig({ ...config, body: e.target.value })}
                placeholder='{"key": "value"}'
                rows={3}
              />
            </div>
          </>
        );

      case "set":
        return (
          <>
            <div className="space-y-2">
              <Label>Nome da Variável</Label>
              <Input
                value={config.variableName || ""}
                onChange={e =>
                  setConfig({ ...config, variableName: e.target.value })
                }
                placeholder="minhaVariavel"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={config.staticValue || ""}
                onChange={e =>
                  setConfig({ ...config, staticValue: e.target.value })
                }
                placeholder="Valor da variável"
              />
            </div>
          </>
        );

      case "uraMenu":
        return (
          <>
            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                value={config.welcomeMessage || ""}
                onChange={e =>
                  setConfig({ ...config, welcomeMessage: e.target.value })
                }
                placeholder="Bem-vindo! Escolha uma opção..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout (segundos)</Label>
              <Input
                type="number"
                value={config.timeout || 30}
                onChange={e =>
                  setConfig({ ...config, timeout: parseInt(e.target.value) })
                }
              />
            </div>
          </>
        );

      case "createTicket":
        return (
          <>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                value={config.subject || ""}
                onChange={e =>
                  setConfig({ ...config, subject: e.target.value })
                }
                placeholder="Assunto do ticket"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={config.priority || "medium"}
                onValueChange={value =>
                  setConfig({ ...config, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return (
          <p className="text-sm text-gray-500">
            Nenhuma configuração adicional disponível para este tipo de nó.
          </p>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Nó</DialogTitle>
          <DialogDescription>
            Configure as propriedades e comportamento deste nó
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Nó</Label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Nome descritivo"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição breve"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-4">
              Configurações Específicas
            </h4>
            {renderConfigFields()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
