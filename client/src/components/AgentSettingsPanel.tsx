import { useState, useEffect } from "react";
import { X, Check, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { AI_AGENTS, getAgentById } from "@/data/aiAgents";
import { IAgentDefinition, IAgentParameter, INodeData } from "@/types/aiAgent";
import { trpc } from "@/lib/trpc";
import {
  PROMPT_LIBRARY,
  PROMPT_CATEGORIES,
  getPromptsByCategory,
} from "@/data/promptLibrary";

interface AgentSettingsPanelProps {
  /** Se o painel está aberto */
  isOpen: boolean;

  /** Callback para fechar o painel */
  onClose: () => void;

  /** Dados atuais do nó */
  nodeData: INodeData;

  /** Callback para salvar alterações */
  onSave: (data: INodeData) => void;
}

/**
 * Painel lateral profissional para configuração de agentes IA
 * Inspirado no N8N com Card Selection e formulário dinâmico
 */
export function AgentSettingsPanel({
  isOpen,
  onClose,
  nodeData,
  onSave,
}: AgentSettingsPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    nodeData.agentId || null
  );
  const [configuration, setConfiguration] = useState<Record<string, any>>(
    nodeData.configuration || {}
  );
  const [prompt, setPrompt] = useState(nodeData.prompt || "");
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testError, setTestError] = useState("");
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const validateTokenMutation = trpc.aiAgents.validateToken.useMutation();

  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : null;

  // Reset state when panel opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(nodeData.agentId || null);
      setConfiguration(nodeData.configuration || {});
      setPrompt(nodeData.prompt || "");
    }
  }, [isOpen, nodeData]);

  const handleAgentSelect = (agent: IAgentDefinition) => {
    setSelectedAgentId(agent.id);

    // Initialize configuration with default values
    const defaultConfig: Record<string, any> = {};
    agent.parameters.forEach(param => {
      defaultConfig[param.key] = param.defaultValue;
    });
    setConfiguration(defaultConfig);
  };

  const handleParameterChange = (key: string, value: unknown) => {
    setConfiguration(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (!selectedAgent) return;

    const updatedData: INodeData = {
      agentId: selectedAgentId,
      configuration,
      prompt,
      nodeName: selectedAgent.name,
    };

    onSave(updatedData);
    onClose();
  };

  const handleValidateToken = async (agentId: string, apiKey: string) => {
    if (!apiKey || apiKey.trim().length === 0) {
      setValidationResult({
        success: false,
        message: "API Key não pode estar vazia",
      });
      return;
    }

    setIsValidatingToken(true);
    setValidationResult(null);

    try {
      // Map agent ID to provider name
      const providerMap: Record<
        string,
        "openai" | "anthropic" | "google" | "meta"
      > = {
        "openai-gpt4o": "openai",
        "anthropic-claude": "anthropic",
        "google-gemini": "google",
        "meta-llama": "meta",
      };

      const provider = providerMap[agentId];
      if (!provider) {
        setValidationResult({
          success: false,
          message: "Provedor desconhecido",
        });
        return;
      }

      // Call tRPC endpoint
      const result = await validateTokenMutation.mutateAsync({
        provider,
        apiKey,
      });

      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao validar token",
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const testAgentMutation = trpc.aiAgents.testAgent.useMutation();

  const handleTestAgent = async () => {
    if (!selectedAgent || !testMessage.trim()) return;

    // Verificar se API Key está configurada
    const apiKey = configuration["apiKey"] || configuration["api_key"];
    if (!apiKey) {
      setTestError(
        "API Key não configurada. Configure a API Key antes de testar."
      );
      return;
    }

    setIsTestingAgent(true);
    setTestError("");
    setTestResponse("");

    try {
      const providerRaw = selectedAgent.provider || "";
      const modelRaw =
        selectedAgent.model ||
        String(configuration["model"] || configuration["agentModel"] || "");
      if (!providerRaw || !modelRaw) {
        setTestError(
          "Provedor/modelo do agente nao configurado. Selecione um agente valido e revise as configuracoes."
        );
        return;
      }

      const result = await testAgentMutation.mutateAsync({
        provider: providerRaw.toLowerCase() as
          | "openai"
          | "anthropic"
          | "google"
          | "meta",
        apiKey,
        model: modelRaw,
        prompt: prompt || "Você é um assistente útil.",
        testMessage,
        maxTokens:
          configuration["maxTokens"] || configuration["max_tokens"] || 500,
        temperature: configuration["temperature"] || 0.7,
      });

      if (result.success && result.response) {
        setTestResponse(result.response);
        if (result.usage) {
          setTestResponse(
            prev =>
              `${prev}\n\n---\n**Uso de Tokens:** ${result.usage?.totalTokens || 0} tokens (${result.usage?.promptTokens || 0} prompt + ${result.usage?.completionTokens || 0} completion)`
          );
        }
      } else {
        setTestError(result.error || "Erro desconhecido ao testar agente");
      }
    } catch (error) {
      setTestError(
        error instanceof Error
          ? error.message
          : "Erro ao testar agente. Verifique as configurações e tente novamente."
      );
    } finally {
      setIsTestingAgent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-background border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Configurar AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Selecione o modelo e ajuste os parâmetros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={!selectedAgentId} size="sm">
              Salvar
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Agent Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Selecione o Modelo de IA
              </Label>
              <div className="grid gap-3">
                {AI_AGENTS.map(agent => {
                  const isSelected = selectedAgentId === agent.id;

                  return (
                    <Card
                      key={agent.id}
                      className={`
                        p-4 cursor-pointer transition-all hover:shadow-md
                        ${isSelected ? "ring-2 ring-primary shadow-lg" : "hover:border-primary/50"}
                      `}
                      onClick={() => handleAgentSelect(agent)}
                      style={{
                        borderLeft: isSelected
                          ? `4px solid ${agent.color}`
                          : "4px solid transparent",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{agent.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{agent.name}</h3>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {agent.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${agent.color}20`,
                                color: agent.color,
                              }}
                            >
                              {agent.category}
                            </Badge>
                            {agent.pricing && (
                              <span className="text-xs text-muted-foreground">
                                ${agent.pricing.inputTokens}/M tokens
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Configuration Form */}
            {selectedAgent && (
              <>
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Prompt do Sistema
                    </Label>
                    <Select
                      onValueChange={promptId => {
                        const selectedPrompt = PROMPT_LIBRARY.find(
                          p => p.id === promptId
                        );
                        if (selectedPrompt) {
                          setPrompt(selectedPrompt.prompt);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="📚 Prompts Prontos" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_CATEGORIES.map(category => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {getPromptsByCategory(category).map(prompt => (
                              <SelectItem key={prompt.id} value={prompt.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {prompt.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {prompt.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Instruções para o modelo de IA..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Define o comportamento e personalidade do assistente. Use
                      variáveis como
                      {" {"}
                      {"{"}customer_name{"}"}
                      {"}"} para personalização. Ou escolha um prompt pronto
                      acima.
                    </span>
                  </p>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <Label className="text-base font-semibold">
                    Parâmetros Avançados
                  </Label>

                  {selectedAgent.parameters.map(param => (
                    <div key={param.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={param.key}
                          className="text-sm font-medium"
                        >
                          {param.label}
                          {param.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        {param.type === "slider" && (
                          <span className="text-sm text-muted-foreground">
                            {configuration[param.key] ?? param.defaultValue}
                          </span>
                        )}
                      </div>

                      {param.description && (
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                        </p>
                      )}

                      {/* Render appropriate input based on type */}
                      {param.type === "string" && (
                        <div className="space-y-2">
                          <Input
                            id={param.key}
                            type="text"
                            value={
                              configuration[param.key] ?? param.defaultValue
                            }
                            onChange={e =>
                              handleParameterChange(param.key, e.target.value)
                            }
                            placeholder={param.placeholder}
                          />
                          {param.key === "api_key" &&
                            configuration[param.key] && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleValidateToken(
                                      selectedAgent.id,
                                      configuration[param.key]
                                    )
                                  }
                                  disabled={isValidatingToken}
                                  className="w-full"
                                >
                                  {isValidatingToken ? (
                                    <>
                                      <span className="animate-spin mr-2">
                                        ⏳
                                      </span>
                                      Validando...
                                    </>
                                  ) : (
                                    "Testar Conexão"
                                  )}
                                </Button>
                                {validationResult && (
                                  <div
                                    className={`p-3 rounded-md text-sm ${
                                      validationResult.success
                                        ? "bg-green-50 text-green-800 border border-green-200"
                                        : "bg-red-50 text-red-800 border border-red-200"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {validationResult.success ? (
                                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      ) : (
                                        <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      )}
                                      <span>{validationResult.message}</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                      )}

                      {param.type === "number" && (
                        <Input
                          id={param.key}
                          type="number"
                          value={configuration[param.key] ?? param.defaultValue}
                          onChange={e =>
                            handleParameterChange(
                              param.key,
                              Number(e.target.value)
                            )
                          }
                          min={param.min}
                          max={param.max}
                        />
                      )}

                      {param.type === "slider" && (
                        <Slider
                          id={param.key}
                          value={[
                            configuration[param.key] ?? param.defaultValue,
                          ]}
                          onValueChange={([value]) =>
                            handleParameterChange(param.key, value)
                          }
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          className="py-4"
                        />
                      )}

                      {param.type === "select" && param.options && (
                        <Select
                          value={configuration[param.key] ?? param.defaultValue}
                          onValueChange={value =>
                            handleParameterChange(param.key, value)
                          }
                        >
                          <SelectTrigger id={param.key}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options.map(option => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {param.type === "textarea" && (
                        <Textarea
                          id={param.key}
                          value={configuration[param.key] ?? param.defaultValue}
                          onChange={e =>
                            handleParameterChange(param.key, e.target.value)
                          }
                          placeholder={param.placeholder}
                          rows={3}
                        />
                      )}

                      {param.type === "boolean" && (
                        <div className="flex items-center gap-2">
                          <input
                            id={param.key}
                            type="checkbox"
                            checked={
                              configuration[param.key] ?? param.defaultValue
                            }
                            onChange={e =>
                              handleParameterChange(param.key, e.target.checked)
                            }
                            className="rounded border-gray-300"
                          />
                          <Label
                            htmlFor={param.key}
                            className="font-normal cursor-pointer"
                          >
                            Ativado
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Test Configuration Section */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Testar Configuração
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      Preview
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envie uma mensagem de teste para validar a configuração
                    antes de ativar o fluxo.
                  </p>

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Digite uma mensagem de teste..."
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleTestAgent}
                      disabled={
                        !selectedAgentId ||
                        !testMessage.trim() ||
                        isTestingAgent
                      }
                      className="w-full"
                      variant="secondary"
                    >
                      {isTestingAgent ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Processando...
                        </>
                      ) : (
                        "Enviar Teste"
                      )}
                    </Button>

                    {testResponse && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Resposta do Modelo:
                        </Label>
                        <p className="text-sm whitespace-pre-wrap">
                          {testResponse}
                        </p>
                      </div>
                    )}

                    {testError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{testError}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedAgentId}
            className="min-w-[100px]"
          >
            Salvar
          </Button>
        </div>
      </div>
    </>
  );
}
