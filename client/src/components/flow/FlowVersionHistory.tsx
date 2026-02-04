import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitBranch, 
  GitCommit, 
  Clock, 
  User, 
  RotateCcw, 
  Eye,
  GitCompare,
  CheckCircle2,
  Save
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FlowVersion {
  id: number;
  version: number;
  commitMessage: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  changes: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };
}

interface FlowVersionHistoryProps {
  flowId: number;
  currentVersion: number;
  onRestore: (versionId: number) => void;
  onCompare: (versionA: number, versionB: number) => void;
}

export function FlowVersionHistory({ 
  flowId, 
  currentVersion, 
  onRestore, 
  onCompare 
}: FlowVersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  // Mock data - substituir por trpc query real
  const versions: FlowVersion[] = [
    {
      id: 1,
      version: 3,
      commitMessage: 'Adicionado nó de validação de CPF',
      createdBy: 'João Silva',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isActive: true,
      changes: {
        nodesAdded: 1,
        nodesRemoved: 0,
        nodesModified: 2,
        edgesAdded: 2,
        edgesRemoved: 0,
      },
    },
    {
      id: 2,
      version: 2,
      commitMessage: 'Corrigido timeout na API de consulta',
      createdBy: 'Maria Santos',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      isActive: false,
      changes: {
        nodesAdded: 0,
        nodesRemoved: 0,
        nodesModified: 1,
        edgesAdded: 0,
        edgesRemoved: 0,
      },
    },
    {
      id: 3,
      version: 1,
      commitMessage: 'Versão inicial do fluxo',
      createdBy: 'João Silva',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      isActive: false,
      changes: {
        nodesAdded: 5,
        nodesRemoved: 0,
        nodesModified: 0,
        edgesAdded: 4,
        edgesRemoved: 0,
      },
    },
  ];

  const handleVersionSelect = (versionId: number) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(v => v !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const handleCommit = () => {
    // Implementar salvamento de versão via tRPC
    console.log('Commit:', commitMessage);
    setShowCommitDialog(false);
    setCommitMessage('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Histórico de Versões</h3>
          <Badge variant="outline">v{currentVersion}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {selectedVersions.length === 2 && (
            <Button variant="outline" size="sm" onClick={handleCompare}>
              <GitCompare className="h-4 w-4 mr-1" />
              Comparar
            </Button>
          )}

          <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="h-4 w-4 mr-1" />
                Salvar Versão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar Nova Versão</DialogTitle>
                <DialogDescription>
                  Adicione uma mensagem descrevendo as alterações feitas nesta versão
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mensagem de Commit</Label>
                  <Textarea
                    placeholder="Ex: Adicionado validação de email e correção de bugs"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCommitDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCommit}
                    disabled={!commitMessage.trim()}
                  >
                    Salvar Versão
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Timeline de Versões */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {versions.map((version, index) => (
            <Card 
              key={version.id} 
              className={`p-4 cursor-pointer transition-all ${
                selectedVersions.includes(version.id) 
                  ? 'ring-2 ring-primary' 
                  : 'hover:shadow-md'
              } ${version.isActive ? 'bg-green-50/50 border-green-200' : ''}`}
              onClick={() => handleVersionSelect(version.id)}
            >
              <div className="flex items-start gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    version.isActive 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {version.isActive ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <GitCommit className="h-5 w-5" />
                    )}
                  </div>
                  {index < versions.length - 1 && (
                    <div className="w-0.5 h-16 bg-border mt-2" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          Versão {version.version}
                        </h4>
                        {version.isActive && (
                          <Badge variant="default" className="text-xs">
                            Ativa
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {version.commitMessage}
                      </p>
                    </div>

                    {!version.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestore(version.id);
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    )}
                  </div>

                  {/* Metadados */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {version.createdBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(version.createdAt, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>

                  {/* Alterações */}
                  <div className="flex items-center gap-3 mt-3">
                    {version.changes.nodesAdded > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50">
                        +{version.changes.nodesAdded} nós
                      </Badge>
                    )}
                    {version.changes.nodesRemoved > 0 && (
                      <Badge variant="outline" className="text-xs bg-red-50">
                        -{version.changes.nodesRemoved} nós
                      </Badge>
                    )}
                    {version.changes.nodesModified > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        ~{version.changes.nodesModified} modificados
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Dica de seleção */}
      {selectedVersions.length > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700">
            {selectedVersions.length === 1 
              ? 'Selecione outra versão para comparar' 
              : 'Clique em "Comparar" para ver as diferenças entre as versões'}
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente de comparação de versões (diff visual)
 */
interface VersionCompareProps {
  versionA: FlowVersion;
  versionB: FlowVersion;
}

export function VersionCompare({ versionA, versionB }: VersionCompareProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">
            Versão {versionA.version}
          </h4>
          <p className="text-sm text-muted-foreground">{versionA.commitMessage}</p>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">
            Versão {versionB.version}
          </h4>
          <p className="text-sm text-muted-foreground">{versionB.commitMessage}</p>
        </Card>
      </div>

      {/* Diff visual - implementar visualização lado a lado dos fluxos */}
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          Visualização de diferenças será implementada aqui
        </p>
      </Card>
    </div>
  );
}
