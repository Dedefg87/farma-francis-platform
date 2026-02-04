import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare } from 'lucide-react';

interface QuickRepliesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
}

export default function QuickRepliesModal({ open, onClose, onSelect }: QuickRepliesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const { data: replies, isLoading } = trpc.quickReplies.list.useQuery(
    {
      search: searchQuery || undefined,
      category: selectedCategory,
    },
    { enabled: open }
  );

  const { data: categories } = trpc.quickReplies.listCategories.useQuery(undefined, {
    enabled: open,
  });

  const handleSelect = (content: string) => {
    onSelect(content);
    onClose();
    setSearchQuery('');
    setSelectedCategory(undefined);
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors: Record<string, string> = {
      'saudacao': 'bg-blue-100 text-blue-800',
      'despedida': 'bg-green-100 text-green-800',
      'informacao': 'bg-purple-100 text-purple-800',
      'pagamento': 'bg-yellow-100 text-yellow-800',
      'endereco': 'bg-orange-100 text-orange-800',
      'produto': 'bg-pink-100 text-pink-800',
    };

    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Respostas Rápidas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar resposta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro de Categorias */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(undefined)}
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}

          {/* Lista de Respostas */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Carregando...</p>
              </div>
            ) : replies && replies.length > 0 ? (
              <div className="space-y-2">
                {replies.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleSelect(reply.content)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{reply.title}</h4>
                      {reply.category && (
                        <Badge className={getCategoryColor(reply.category)}>
                          {reply.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{reply.content}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <MessageSquare className="w-12 h-12 mb-2 text-gray-300" />
                <p>Nenhuma resposta rápida encontrada</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
