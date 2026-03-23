/**
 * Componente de filtro por tags
 * Permite filtrar listas por uma ou múltiplas tags
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface TagFilterProps {
  onFilterChange: (tagIds: number[]) => void;
  selectedTags?: number[];
}

export function TagFilter({ onFilterChange, selectedTags = [] }: TagFilterProps) {
  const [localSelectedTags, setLocalSelectedTags] = useState<number[]>(selectedTags);

  const { data: allTags } = trpc.tags.list.useQuery();
  const { data: tagStats } = trpc.tags.getTagStats.useQuery();
  
  // Criar mapa de contadores
  const tagCounts = tagStats?.reduce((acc, stat) => {
    acc[stat.tagId] = stat.conversationCount;
    return acc;
  }, {} as Record<number, number>) || {};

  useEffect(() => {
    setLocalSelectedTags(selectedTags);
  }, [selectedTags]);

  const handleToggleTag = (tagId: number) => {
    const newSelection = localSelectedTags.includes(tagId)
      ? localSelectedTags.filter(id => id !== tagId)
      : [...localSelectedTags, tagId];
    
    setLocalSelectedTags(newSelection);
    onFilterChange(newSelection);
  };

  const handleClearFilters = () => {
    setLocalSelectedTags([]);
    onFilterChange([]);
  };

  const selectedTagsData = allTags?.filter(tag => localSelectedTags.includes(tag.id)) || [];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar por Tags
            {localSelectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {localSelectedTags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Selecionar Tags</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {allTags && allTags.length > 0 ? (
            allTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={localSelectedTags.includes(tag.id)}
                onCheckedChange={() => handleToggleTag(tag.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                  {tagCounts[tag.id] !== undefined && tagCounts[tag.id] > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">({tagCounts[tag.id]})</span>
                  )}
                </div>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhuma tag disponível
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tags selecionadas */}
      {selectedTagsData.length > 0 && (
        <div className="flex items-center gap-2">
          {selectedTagsData.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color }}
              className="text-white cursor-pointer"
              onClick={() => handleToggleTag(tag.id)}
            >
              {tag.name}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-6 px-2 text-xs"
          >
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
