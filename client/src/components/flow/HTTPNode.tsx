import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Play, Copy } from 'lucide-react';

interface HTTPHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HTTPNodeConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: HTTPHeader[];
  authType: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
  authConfig: Record<string, string>;
  body: string;
  bodyType: 'json' | 'form' | 'xml' | 'raw';
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

interface HTTPNodeEditorProps {
  config: HTTPNodeConfig;
  onChange: (config: HTTPNodeConfig) => void;
}

export function HTTPNodeEditor({ config, onChange }: HTTPNodeEditorProps) {
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const addHeader = () => {
    const newHeader: HTTPHeader = {
      id: `header-${Date.now()}`,
      key: '',
      value: '',
      enabled: true,
    };

    onChange({
      ...config,
      headers: [...config.headers, newHeader],
    });
  };

  const removeHeader = (id: string) => {
    onChange({
      ...config,
      headers: config.headers.filter(h => h.id !== id),
    });
  };

  const updateHeader = (id: string, updates: Partial<HTTPHeader>) => {
    onChange({
      ...config,
      headers: config.headers.map(h => 
        h.id === id ? { ...h, ...updates } : h
      ),
    });
  };

  const testRequest = async () => {
    setTestLoading(true);
    try {
      // Implementar teste real via tRPC
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult({
        status: 200,
        statusText: 'OK',
        data: { success: true, message: 'Teste bem-sucedido' },
        headers: { 'content-type': 'application/json' },
        duration: 234,
      });
    } catch (error) {
      setTestResult({
        error: 'Erro ao testar requisição',
        details: error,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Método e URL */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3">
          <Select
            value={config.method}
            onValueChange={(value: unknown) => onChange({ ...config, method: value })}
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

        <div className="col-span-9">
          <Input
            placeholder="https://api.exemplo.com/endpoint"
            value={config.url}
            onChange={(e) => onChange({ ...config, url: e.target.value })}
          />
        </div>
      </div>

      {/* Tabs de configuração */}
      <Tabs defaultValue="headers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="auth">Autenticação</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        {/* Headers */}
        <TabsContent value="headers" className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Headers HTTP</Label>
            <Button onClick={addHeader} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {config.headers.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground text-sm">
                Nenhum header adicionado
              </Card>
            ) : (
              config.headers.map((header) => (
                <div key={header.id} className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Input
                      placeholder="Nome do header"
                      value={header.key}
                      onChange={(e) => updateHeader(header.id, { key: e.target.value })}
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      placeholder="Valor"
                      value={header.value}
                      onChange={(e) => updateHeader(header.id, { value: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeader(header.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Headers comuns */}
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Headers Comuns</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Accept', value: 'application/json' },
                { key: 'User-Agent', value: 'Farma-Francis-Bot/1.0' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newHeader: HTTPHeader = {
                      id: `header-${Date.now()}`,
                      key: preset.key,
                      value: preset.value,
                      enabled: true,
                    };
                    onChange({
                      ...config,
                      headers: [...config.headers, newHeader],
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {preset.key}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Autenticação */}
        <TabsContent value="auth" className="space-y-3">
          <div>
            <Label>Tipo de Autenticação</Label>
            <Select
              value={config.authType}
              onValueChange={(value: unknown) => onChange({ ...config, authType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.authType === 'bearer' && (
            <div>
              <Label>Token</Label>
              <Input
                type="password"
                placeholder="seu-token-aqui"
                value={config.authConfig.token || ''}
                onChange={(e) => onChange({
                  ...config,
                  authConfig: { ...config.authConfig, token: e.target.value },
                })}
              />
            </div>
          )}

          {config.authType === 'basic' && (
            <>
              <div>
                <Label>Usuário</Label>
                <Input
                  placeholder="usuario"
                  value={config.authConfig.username || ''}
                  onChange={(e) => onChange({
                    ...config,
                    authConfig: { ...config.authConfig, username: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="senha"
                  value={config.authConfig.password || ''}
                  onChange={(e) => onChange({
                    ...config,
                    authConfig: { ...config.authConfig, password: e.target.value },
                  })}
                />
              </div>
            </>
          )}

          {config.authType === 'apikey' && (
            <>
              <div>
                <Label>Nome do Header</Label>
                <Input
                  placeholder="X-API-Key"
                  value={config.authConfig.headerName || ''}
                  onChange={(e) => onChange({
                    ...config,
                    authConfig: { ...config.authConfig, headerName: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sua-api-key"
                  value={config.authConfig.apiKey || ''}
                  onChange={(e) => onChange({
                    ...config,
                    authConfig: { ...config.authConfig, apiKey: e.target.value },
                  })}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Body */}
        <TabsContent value="body" className="space-y-3">
          <div>
            <Label>Tipo de Conteúdo</Label>
            <Select
              value={config.bodyType}
              onValueChange={(value: unknown) => onChange({ ...config, bodyType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form">Form Data</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Conteúdo</Label>
            <Textarea
              placeholder={
                config.bodyType === 'json' 
                  ? '{\n  "chave": "valor"\n}' 
                  : 'Conteúdo do body'
              }
              value={config.body}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>

        {/* Avançado */}
        <TabsContent value="advanced" className="space-y-3">
          <div>
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              placeholder="30000"
              value={config.timeout}
              onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) || 30000 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tempo máximo de espera pela resposta
            </p>
          </div>

          <div>
            <Label>Tentativas de Retry</Label>
            <Input
              type="number"
              placeholder="3"
              value={config.retryCount}
              onChange={(e) => onChange({ ...config, retryCount: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Número de tentativas em caso de falha
            </p>
          </div>

          <div>
            <Label>Delay entre Retries (ms)</Label>
            <Input
              type="number"
              placeholder="1000"
              value={config.retryDelay}
              onChange={(e) => onChange({ ...config, retryDelay: parseInt(e.target.value) || 1000 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tempo de espera entre tentativas (backoff exponencial)
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Testar Requisição */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between mb-3">
          <Label>Testar Requisição</Label>
          <Button onClick={testRequest} size="sm" disabled={testLoading}>
            <Play className="h-4 w-4 mr-1" />
            {testLoading ? 'Testando...' : 'Testar'}
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2">
            {testResult.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Erro:</strong> {testResult.error}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={testResult.status < 300 ? 'default' : 'destructive'}>
                    {testResult.status} {testResult.statusText}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {testResult.duration}ms
                  </span>
                </div>

                <div>
                  <Label className="text-xs">Resposta:</Label>
                  <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-48 mt-1">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
