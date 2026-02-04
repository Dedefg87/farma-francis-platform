import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Tag, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FlowTag {
  id: number;
  name: string;
  color: string;
  description?: string;
  flowCount: number;
}

const PRESET_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Amarelo', value: '#f59e0b' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Cinza', value: '#6b7280' },
];

export function TagManager() {
  const [tags, setTags] = useState<FlowTag[]>([
    { id: 1, name: 'Vendas', color: '#10b981', description: 'Fluxos relacionados a vendas', flowCount: 5 },
    { id: 2, name: 'Suporte', color: '#3b82f6', description: 'Fluxos de atendimento ao cliente', flowCount: 8 },
    { id: 3, name: 'Marketing', color: '#f59e0b', description: 'Campanhas e promoções', flowCount: 3 },
    { id: 4, name: 'Onboarding', color: '#8b5cf6', description: 'Boas-vindas a novos clientes', flowCount: 2 },
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<FlowTag | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6', description: '' });

  const createTag = () => {
    const tag: FlowTag = {
      id: Date.now(),
      name: newTag.name,
      color: newTag.color,
      description: newTag.description,
      flowCount: 0,
    };
    setTags([...tags, tag]);
    setNewTag({ name: '', color: '#3b82f6', description: '' });
    setShowCreateDialog(false);
  };

  const updateTag = () => {
    if (!editingTag) return;
    setTags(tags.map(t => t.id === editingTag.id ? editingTag : t));
    setEditingTag(null);
  };

  const deleteTag = (id: number) => {
    setTags(tags.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Gerenciar Tags</h3>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tag</DialogTitle>
              <DialogDescription>
                Tags ajudam a organizar e filtrar seus fluxos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Tag *</Label>
                <Input
                  placeholder="Ex: Vendas, Suporte, Marketing"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTag.color === color.value 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewTag({ ...newTag, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Breve descrição da tag"
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createTag}
                  disabled={!newTag.name.trim()}
                >
                  Criar Tag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tags.map((tag) => (
          <Card key={tag.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div 
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{tag.name}</h4>
                  {tag.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tag.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {tag.flowCount} {tag.flowCount === 1 ? 'fluxo' : 'fluxos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTag(tag)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Tag</DialogTitle>
                    </DialogHeader>

                    {editingTag && (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nome da Tag</Label>
                          <Input
                            value={editingTag.name}
                            onChange={(e) => setEditingTag({ 
                              ...editingTag, 
                              name: e.target.value 
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <div className="grid grid-cols-9 gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  editingTag.color === color.value 
                                    ? 'border-foreground scale-110' 
                                    : 'border-transparent hover:scale-105'
                                }`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setEditingTag({ 
                                  ...editingTag, 
                                  color: color.value 
                                })}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input
                            value={editingTag.description || ''}
                            onChange={(e) => setEditingTag({ 
                              ...editingTag, 
                              description: e.target.value 
                            })}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingTag(null)}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={updateTag}>
                            Salvar
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Deseja realmente excluir a tag "${tag.name}"?`)) {
                      deleteTag(tag.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tags.length === 0 && (
        <Card className="p-8 text-center">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhuma tag criada ainda. Clique em "Nova Tag" para começar.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente para selecionar tags em um fluxo
 */
interface TagSelectorProps {
  selectedTags: number[];
  onChange: (tags: number[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  // Mock data - substituir por trpc query real
  const availableTags: FlowTag[] = [
    { id: 1, name: 'Vendas', color: '#10b981', flowCount: 5 },
    { id: 2, name: 'Suporte', color: '#3b82f6', flowCount: 8 },
    { id: 3, name: 'Marketing', color: '#f59e0b', flowCount: 3 },
    { id: 4, name: 'Onboarding', color: '#8b5cf6', flowCount: 2 },
  ];

  const toggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            style={selectedTags.includes(tag.id) ? { 
              backgroundColor: tag.color,
              borderColor: tag.color,
            } : {}}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
            {selectedTags.includes(tag.id) && (
              <X className="h-3 w-3 ml-1" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
