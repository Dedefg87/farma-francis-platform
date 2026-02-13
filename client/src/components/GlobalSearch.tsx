import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  FileText,
  Users,
  MessageSquare,
  Workflow,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface SearchResult {
  id: string;
  type: "flow" | "customer" | "ticket" | "message" | "employee";
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  relevance: number;
  highlight?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Fluxo de boas-vindas",
    "Cliente João Silva",
    "Tickets pendentes",
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [, setLocation] = useLocation();

  // Atalho de teclado Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Busca com debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    // Implementar busca real via tRPC
    // Simulação de resultados
    const mockResultsBase: SearchResult[] = [
      // Temporariamente desabilitado - Automação
      // {
      //   id: '1',
      //   type: 'flow',
      //   title: 'Boas-vindas WhatsApp',
      //   subtitle: 'Fluxo de Automação',
      //   description: 'Fluxo automático de boas-vindas para novos clientes via WhatsApp',
      //   url: '/automation/flow/1',
      //   relevance: 0.95,
      //   highlight: 'Fluxo automático de <mark>boas-vindas</mark> para novos clientes',
      // },
      {
        id: "2",
        type: "customer" as const,
        title: "João Silva",
        subtitle: "Cliente",
        description: "joao@email.com • +55 11 98765-4321",
        url: "/crm/customer/2",
        relevance: 0.85,
      },
      {
        id: "3",
        type: "ticket" as const,
        title: "Dúvida sobre medicamento #12345",
        subtitle: "Ticket",
        description: "Aberto há 2 horas • Prioridade Alta",
        url: "/tickets/12345",
        relevance: 0.75,
      },
    ];

    const filtered = mockResultsBase.filter(
      (r: SearchResult) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered);
    setIsSearching(false);
  };

  const handleResultClick = (result: SearchResult) => {
    // Adicionar aos recentes
    if (!recentSearches.includes(query)) {
      setRecentSearches([query, ...recentSearches.slice(0, 4)]);
    }

    // Navegar
    setLocation(result.url);
    setIsOpen(false);
    setQuery("");
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "flow":
        return <Workflow className="h-5 w-5 text-blue-500" />;
      case "customer":
        return <Users className="h-5 w-5 text-green-500" />;
      case "ticket":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "employee":
        return <Users className="h-5 w-5 text-cyan-500" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    const labels = {
      flow: "Fluxo",
      customer: "Cliente",
      ticket: "Ticket",
      message: "Mensagem",
      employee: "Funcionário",
    };
    return labels[type];
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar fluxos, clientes, tickets, mensagens..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-10 pr-10 h-12 text-base"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="p-4 pt-2">
              {/* Buscas Recentes */}
              {!query && recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Buscas Recentes
                    </span>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors text-sm"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultados */}
              {query && (
                <>
                  {isSearching ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Buscando...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum resultado encontrado para "{query}"
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Agrupar por tipo */}
                      {[
                        "flow",
                        "customer",
                        "ticket",
                        "message",
                        "employee",
                      ].map(type => {
                        const typeResults = results.filter(
                          r => r.type === type
                        );
                        if (typeResults.length === 0) return null;

                        return (
                          <div key={type} className="mb-4">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-3">
                              {getTypeLabel(type as SearchResult["type"])}s
                            </h3>
                            <div className="space-y-1">
                              {typeResults.map(result => (
                                <button
                                  key={result.id}
                                  onClick={() => handleResultClick(result)}
                                  className="w-full text-left p-3 rounded hover:bg-accent transition-colors group"
                                >
                                  <div className="flex items-start gap-3">
                                    {getIcon(result.type)}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                          {result.title}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {result.relevance > 0.9
                                            ? "Alta"
                                            : result.relevance > 0.7
                                              ? "Média"
                                              : "Baixa"}{" "}
                                          relevância
                                        </Badge>
                                      </div>

                                      {result.description && (
                                        <p
                                          className="text-sm text-muted-foreground mt-1"
                                          dangerouslySetInnerHTML={{
                                            __html:
                                              result.highlight ||
                                              result.description,
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer com dicas */}
          <div className="border-t p-3 bg-muted/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border">
                    ↑↓
                  </kbd>{" "}
                  Navegar
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border">
                    Enter
                  </kbd>{" "}
                  Abrir
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border">
                    Esc
                  </kbd>{" "}
                  Fechar
                </span>
              </div>
              <span>{results.length} resultados</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
