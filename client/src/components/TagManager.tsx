/**
 * Componente de gerenciamento de tags coloridas
 * Permite criar, editar e aplicar tags em conversas/tickets
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

interface TagManagerProps {
  conversationId?: string;
  ticketId?: number;
  selectedTags?: number[];
  onTagsChange?: (tagIds: number[]) => void;
}

export function TagManager({ conversationId, ticketId, selectedTags = [], onTagsChange }: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const { data: allTags, refetch: refetchTags } = trpc.tags.list.useQuery();
  
  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => {
      toast.success("Tag criada!");
      setNewTagName("");
      setNewTagColor("#3b82f6");
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const addTagToConversation = trpc.tags.addToConversation.useMutation({
    onSuccess: () => {
      toast.success("Tag adicionada!");
      refetchTags();
    },
  });

  const removeTagFromConversation = trpc.tags.removeFromConversation.useMutation({
    onSuccess: () => {
      toast.success("Tag removida!");
      refetchTags();
    },
  });

  const addTagToTicket = trpc.tags.addToTicket.useMutation({
    onSuccess: () => {
      toast.success("Tag adicionada!");
      refetchTags();
    },
  });

  const removeTagFromTicket = trpc.tags.removeFromTicket.useMutation({
    onSuccess: () => {
      toast.success("Tag removida!");
      refetchTags();
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTag.mutate({
      name: newTagName,
      color: newTagColor,
    });
  };

  const handleToggleTag = (tagId: number) => {
    const isSelected = selectedTags.includes(tagId);
    
    if (conversationId) {
      if (isSelected) {
        removeTagFromConversation.mutate({ conversationId, tagId });
      } else {
        addTagToConversation.mutate({ conversationId, tagId });
      }
    } else if (ticketId) {
      if (isSelected) {
        removeTagFromTicket.mutate({ ticketId, tagId });
      } else {
        addTagToTicket.mutate({ ticketId, tagId });
      }
    }

    // Update local state
    if (onTagsChange) {
      if (isSelected) {
        onTagsChange(selectedTags.filter(id => id !== tagId));
      } else {
        onTagsChange([...selectedTags, tagId]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon className="w-4 h-4 mr-2" />
          Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
          <DialogDescription>
            Adicione ou remova tags para organizar suas conversas e tickets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tags disponíveis */}
          <div>
            <Label>Tags Disponíveis</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allTags?.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="cursor-pointer text-white relative pr-8"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {tag.name}
                    {isSelected && (
                      <X className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2" />
                    )}
                  </Badge>
                );
              })}
              {allTags?.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda</p>
              )}
            </div>
          </div>

          {/* Criar nova tag */}
          <div className="border-t pt-4">
            <Label>Criar Nova Tag</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Nome da tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateTag();
                  }
                }}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
