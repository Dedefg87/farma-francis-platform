import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';

interface TagsManagerProps {
  conversationId: number;
  open: boolean;
  onClose: () => void;
}

export function TagsManager({ conversationId, open, onClose }: TagsManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const { data: allTags } = trpc.tags.list.useQuery();
  const { data: conversationTags, refetch: refetchConversationTags } =
    trpc.tags.getConversationTags.useQuery({ conversationId });

  const createTagMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      setNewTagName('');
      toast.success('Tag criada!');
    },
  });

  const addTagMutation = trpc.tags.addToConversation.useMutation({
    onSuccess: () => {
      refetchConversationTags();
      toast.success('Tag adicionada!');
    },
  });

  const removeTagMutation = trpc.tags.removeFromConversation.useMutation({
    onSuccess: () => {
      refetchConversationTags();
      toast.success('Tag removida!');
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({
      name: newTagName,
      color: newTagColor,
    });
  };

  const handleAddTag = (tagId: number) => {
    addTagMutation.mutate({ conversationId, tagId });
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate({ conversationId, tagId });
  };

  const conversationTagIds = conversationTags?.map((t) => t.id) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tags Aplicadas */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tags Aplicadas</h4>
            <div className="flex flex-wrap gap-2">
              {conversationTags && conversationTags.length > 0 ? (
                conversationTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">Nenhuma tag aplicada</p>
              )}
            </div>
          </div>

          {/* Tags Disponíveis */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tags Disponíveis</h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {allTags
                ?.filter((tag) => !conversationTagIds.includes(tag.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white hover:opacity-80"
                    style={{ backgroundColor: tag.color }}
                  >
                    <Plus className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Criar Nova Tag */}
          <div>
            <h4 className="text-sm font-medium mb-2">Criar Nova Tag</h4>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da tag"
                className="flex-1"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <TagIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
