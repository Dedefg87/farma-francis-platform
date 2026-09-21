import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Radio,
  Users,
  Plus,
  Search,
  Trash2,
  Send,
  MessageCircle,
  ChevronRight,
  X,
  List,
  Megaphone,
  Paperclip,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface BroadcastListManagerProps {
  onClose: () => void;
}

export function BroadcastListManager({ onClose }: BroadcastListManagerProps) {
  const [view, setView] = useState<
    "list" | "create" | "detail" | "add-members"
  >("list");
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  // [FIX] Central de Disparo: abas, busca de contato e progresso do envio
  const [activeTab, setActiveTab] = useState<"disparo" | "contato">("disparo");
  const [contactQuery, setContactQuery] = useState("");
  const [contactTarget, setContactTarget] = useState<{ customerId: number; name: string; phone: string } | null>(null);
  const [lookupListId, setLookupListId] = useState<number | null>(null);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; paused?: boolean; pauseMin?: number } | null>(null);

  // Queries
  const { data, refetch: refetchLists } = trpc.broadcast.list.useQuery({ page: 1, limit: 1000 });
  const { data: listDetail, refetch: refetchDetail } =
    trpc.broadcast.getById.useQuery(
      { listId: selectedListId! },
      { enabled: selectedListId !== null && view === "detail" }
    );
  const { data: listMembers, refetch: refetchMembers } =
    trpc.broadcast.listMembers.useQuery(
      { listId: selectedListId! },
      { enabled: selectedListId !== null && view === "detail" }
    );
  const { data: availableCustomers } = trpc.broadcast.searchCustomers.useQuery(
    { query: searchQuery, excludeListId: selectedListId || undefined },
    { enabled: view === "add-members" }
  );
  // [FIX] Localizar contato: reusa os endpoints searchCustomers e listMembers existentes
  const { data: contactSearchResults } = trpc.broadcast.searchCustomers.useQuery(
    { query: contactQuery, excludeListId: undefined },
    { enabled: activeTab === "contato" && contactQuery.trim().length > 0 }
  );
  const { data: lookupMembers, refetch: refetchLookupMembers } = trpc.broadcast.listMembers.useQuery(
    { listId: lookupListId! },
    { enabled: lookupListId !== null && activeTab === "contato" }
  );

  // Mutations
  const deleteMany = trpc.broadcast.deleteMany.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} lista(s) excluída(s)!`);
      setSelectedListIds([]);
      refetchLists();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Mutations
  const createList = trpc.broadcast.create.useMutation({
    onSuccess: () => {
      toast.success("Lista criada com sucesso!");
      setNewListName("");
      setNewListDescription("");
      setView("list");
      refetchLists();
    },
    onError: error => {
      toast.error(`Erro ao criar lista: ${error.message}`);
    },
  });

  const addMember = trpc.broadcast.addMember.useMutation({
    onSuccess: () => {
      toast.success("Contato adicionado!");
      refetchDetail();
      refetchMembers();
      refetchLists();
    },
    onError: error => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  const removeMember = trpc.broadcast.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Contato removido!");
      refetchDetail();
      refetchMembers();
      refetchLists();
      refetchLookupMembers();
    },
    onError: error => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const deleteList = trpc.broadcast.delete.useMutation({
    onSuccess: () => {
      toast.success("Lista excluída!");
      setView("list");
      setSelectedListId(null);
      refetchLists();
    },
    onError: error => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const sendMessage = trpc.broadcast.sendMessage.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Mensagem enfileirada para envio! (ID: ${data.messageId})`);
      setMessageContent("");
      setFileAttachment(null);
    },
    onError: error => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("Digite um nome para a lista");
      return;
    }
    createList.mutate({
      name: newListName,
      description: newListDescription,
    });
  };

  const handleAddMembers = () => {
    if (selectedCustomers.length === 0) {
      toast.error("Selecione pelo menos um contato");
      return;
    }

    selectedCustomers.forEach(customerId => {
      addMember.mutate({
        listId: selectedListId!,
        customerId,
      });
    });

    setSelectedCustomers([]);
    setView("detail");
  };

  const handleRemoveMember = (memberId: number) => {
    removeMember.mutate({ memberId });
  };

  const toggleListSelection = (listId: number) => {
    setSelectedListIds(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const toggleAllLists = () => {
    if (!data?.lists) return;
    const allIds = data.lists.map(l => l.id);
    if (selectedListIds.length === allIds.length) {
      setSelectedListIds([]);
    } else {
      setSelectedListIds(allIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedListIds.length === 0) {
      toast.error("Selecione pelo menos uma lista");
      return;
    }
    if (!confirm(`Excluir ${selectedListIds.length} lista(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }
    deleteMany.mutate({ listIds: selectedListIds });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho: 16MB
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 16MB)");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/broadcast/upload-temp-file", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Upload falhou");

      // Extrair URL de forma robusta (suporta ambos os formatos)
      let fileUrl: string;
      if (typeof data.fileUrl === 'string') {
        fileUrl = data.fileUrl;
      } else if (data.fileUrl && typeof data.fileUrl === 'object' && 'url' in data.fileUrl) {
        fileUrl = (data.fileUrl as any).url;
      } else if (data.url) {
        fileUrl = data.url;
      } else {
        throw new Error("URL do arquivo não encontrada na resposta");
      }

      setFileAttachment({
        url: fileUrl,
        name: data.fileName,
        type: data.fileType,
        size: data.fileSize,
      });
      toast.success("Arquivo anexado!");
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    }
  };

  const handleRemoveFile = () => {
    setFileAttachment(null);
  };

  // [FIX] Monta os MESMOS parametros do envio existente (criterios preservados), trocando apenas a lista
  const buildSendVars = (listId: number): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      listId,
      content: messageContent,
    };
    if (fileAttachment) {
      payload.fileUrl = fileAttachment.url;
      payload.fileName = fileAttachment.name;
      payload.fileType = fileAttachment.type;
      payload.fileSize = fileAttachment.size;
    }
    return payload;
  };

  // [FIX] Disparo em massa: mesma mensagem para as listas selecionadas, em sequencia (da 1a a ultima)
  const handleSendToSelected = async () => {
    if (selectedListIds.length === 0) { toast.error("Selecione pelo menos uma lista"); return; }
    if (!messageContent.trim() && !fileAttachment) { toast.error("Digite uma mensagem ou anexe um arquivo"); return; }
    if (!confirm("Enviar a mesma mensagem para " + selectedListIds.length + " lista(s), em sequencia?")) return;

    const orderedIds = (data?.lists || []).map((l) => Number(l.id)).filter((id) => selectedListIds.includes(id));
    const targets = orderedIds.length > 0 ? orderedIds : selectedListIds;

    setSendProgress({ current: 0, total: targets.length });
    try {
      let done = 0;
      for (const listId of targets) {
        done += 1;
        setSendProgress({ current: done, total: targets.length });
        try {
          await sendMessage.mutateAsync(buildSendVars(listId));
        } catch (listErr: any) {
          console.warn('[Broadcast] Falha na lista', listId, listErr?.message || 'erro');
          toast.error('Lista ' + listId + ' falhou: ' + (listErr?.message || 'erro desconhecido') + ' — seguindo para a proxima');
        }
        // [fix50] Envio direto em sequencia: sem pausa entre listas (filtro 24h permanece no servidor)
      }
      toast.success("Envio concluido para " + targets.length + " lista(s)!");
      setMessageContent("");
      setFileAttachment(null);
      setSelectedListIds([]);
    } catch (err: any) {
      toast.error("Falha ao enviar: " + (err?.message || "erro desconhecido"));
    } finally {
      setSendProgress(null);
    }
  };

  const handleSendMessage = () => {
    if (!messageContent.trim() && !fileAttachment) {
      toast.error("Digite uma mensagem ou anexe um arquivo");
      return;
    }

    const payload: unknown = {
      listId: selectedListId!,
      content: messageContent,
    };
    if (fileAttachment) {
      payload.fileUrl = fileAttachment.url;
      payload.fileName = fileAttachment.name;
      payload.fileType = fileAttachment.type;
      payload.fileSize = fileAttachment.size;
    }


    sendMessage.mutate(payload);

    // Limpar após envio
    setMessageContent("");
    setFileAttachment(null);
  };

  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      }
      // Limitar a 50 contatos
      if (prev.length >= 50) {
        toast.error("Limite máximo de 50 contatos atingido");
        return prev;
      }
      return [...prev, customerId];
    });
  };

  // View: Lista de todas as listas
  if (view === "list") {
    if (activeTab === "contato") {
      const selectedLists = data?.lists || [];
      const contactResults = Array.isArray(contactSearchResults) ? contactSearchResults : ((contactSearchResults as any)?.customers || []);
      const targetMember = lookupListId !== null && lookupMembers ? lookupMembers.find((m: any) => Number(m.customerId) === Number(contactTarget?.customerId)) : null;
      return (
        <div className="space-y-4">
          <div className="flex gap-2 border-b pb-3">
            <Button variant="outline" size="sm" onClick={() => setActiveTab("disparo")}>Disparo</Button>
            <Button variant="default" size="sm" onClick={() => setActiveTab("contato")}>Localizar contato</Button>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Localizar contato</h3>
            <p className="text-sm text-muted-foreground">Busque por nome ou telefone para ver em quais listas a pessoa esta e remove-la.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou telefone..." value={contactQuery} onChange={(e) => { setContactQuery(e.target.value); setContactTarget(null); setLookupListId(null); }} />
          </div>
          {contactQuery.trim().length > 0 && contactResults.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado.</p>
          )}
          {contactResults.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar><AvatarFallback>{(c.name || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.phoneNumber || c.email || ""}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setContactTarget({ customerId: Number(c.id), name: c.name || "", phone: c.phone || c.phoneNumber || "" }); setLookupListId(null); }}>Selecionar</Button>
            </div>
          ))}
          {contactTarget && (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{contactTarget.name || "Contato"}</p>
                  <p className="text-xs text-muted-foreground">{contactTarget.phone}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setContactTarget(null); setLookupListId(null); }}><X className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Em qual lista deseja verificar?</p>
              <div className="space-y-2">
                {selectedLists.map((lst: any) => (
                  <div key={lst.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lst.name}</p>
                      <p className="text-xs text-muted-foreground">{lst.memberCount || 0} contatos</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setLookupListId(Number(lst.id))}>Verificar</Button>
                  </div>
                ))}
              </div>
              {lookupListId !== null && (
                <div className="p-3 bg-background border rounded space-y-2">
                  <p className="text-sm font-medium">Lista: {selectedLists.find((l: any) => Number(l.id) === lookupListId)?.name || "..."}</p>
                  {targetMember ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-600">Contato esta nesta lista</p>
                      <Button variant="destructive" size="sm" onClick={() => removeMember.mutate({ memberId: targetMember.id })} disabled={removeMember.isPending}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remover
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Contato nao esta nesta lista.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b pb-3">
          <Button variant="default" size="sm" onClick={() => setActiveTab("disparo")}>Disparo</Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("contato")}>Localizar contato</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Listas de Transmissão</h3>
            <p className="text-sm text-muted-foreground">Crie listas com até 50 contatos para enviar mensagens em massa</p>
          </div>
          <Button onClick={() => setView("create")}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Lista
          </Button>
        </div>
        {data?.lists && data.lists.length > 0 && (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
            <Button variant="outline" size="sm" onClick={toggleAllLists} disabled={!data?.lists || data.lists.length === 0}>
              {selectedListIds.length === data.lists.length ? "Desmarcar todas" : "Selecionar todas"}
            </Button>
            {selectedListIds.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">{selectedListIds.length} selecionada(s)</span>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleteMany.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir selecionadas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedListIds([])}>Limpar</Button>
              </>
            )}
          </div>
        )}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedListIds.length > 0 ? `Disparo em massa para ${selectedListIds.length} lista(s)` : "Disparo em massa"}
            </p>
            {selectedListIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedListIds([])}><X className="w-4 h-4" /></Button>
            )}
          </div>
          {selectedListIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data?.lists?.filter((l: any) => selectedListIds.includes(Number(l.id))).map((l: any) => (
                <Badge key={l.id} variant="secondary">{l.name}</Badge>
              ))}
            </div>
          )}
          <div className="relative">
            <Textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="Escreva a mensagem que sera enviada para as listas selecionadas..." rows={3} className="bg-background pr-10" />
            <label className="absolute right-2 top-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={sendProgress !== null} />
              <Paperclip className="w-5 h-5" />
            </label>
          </div>
          {fileAttachment && (
            <div className="flex items-center gap-2 p-2 bg-background rounded border">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm truncate flex-1">{fileAttachment.name}</span>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} disabled={sendProgress !== null}><X className="w-4 h-4" /></Button>
            </div>
          )}
          {sendProgress && (
            <p className="text-xs text-muted-foreground">{sendProgress.paused ? "Aguardando pausa de " + sendProgress.pauseMin + " min antes da proxima lista..." : "Enviando " + sendProgress.current + "/" + sendProgress.total + "..."}</p>
          )}
          <Button onClick={handleSendToSelected} disabled={sendProgress !== null || selectedListIds.length === 0 || (!messageContent.trim() && !fileAttachment)} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {sendProgress ? "Enviando..." : selectedListIds.length > 0 ? `Enviar para ${selectedListIds.length} lista(s) em sequencia` : "Selecione uma lista para enviar"}
          </Button>
        </div>
        <div className="space-y-2">
          {data?.lists?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma lista criada</p>
              <p className="text-sm">Crie sua primeira lista de transmissão</p>
            </div>
          ) : (
            data?.lists?.map(list => (
              <div key={list.id} className={`p-4 rounded-lg border transition-colors ${selectedListIds.includes(list.id) ? "bg-accent border-primary" : ""}`}>
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedListIds.includes(list.id)} onCheckedChange={() => toggleListSelection(list.id)} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 text-left cursor-pointer" onClick={() => { setSelectedListId(list.id); setView("detail"); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">{list.memberCount} contato{list.memberCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
  // View: Criar nova lista
  if (view === "create") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <h3 className="text-lg font-semibold">Nova Lista de Transmissão</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Lista</label>
            <Input
              placeholder="Ex: Clientes VIP"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Textarea
              placeholder="Descrição da lista..."
              value={newListDescription}
              onChange={e => setNewListDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setView("list")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateList}
              className="flex-1"
              disabled={createList.isPending}
            >
              {createList.isPending ? "Criando..." : "Criar Lista"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // View: Detalhes da lista
  if (view === "detail" && listDetail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{listDetail.name}</h3>
              <p className="text-sm text-muted-foreground">
                {listMembers?.length || 0} de 50 contatos
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteList.mutate({ listId: listDetail.id })}
            disabled={deleteList.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Enviar mensagem */}
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <label className="text-sm font-medium">
            Enviar mensagem para lista
          </label>

          <div className="relative">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={messageContent}
              onChange={e => setMessageContent(e.target.value)}
              className="bg-background pr-10"
              rows={3}
            />
            <label className="absolute right-2 top-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={sendMessage.isPending}
              />
              <Paperclip className="w-5 h-5" />
            </label>
          </div>

          {/* File attachment preview */}
          {fileAttachment && (
            <div className="flex items-center gap-2 p-2 bg-background rounded border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fileAttachment.type?.startsWith?.("image/") ? (
                  <img
                    src={fileAttachment.url}
                    alt={fileAttachment.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileAttachment.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(fileAttachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={sendMessage.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendMessage}
            disabled={sendMessage.isPending || (!messageContent.trim() && !fileAttachment)}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMessage.isPending
              ? "Enviando..."
              : `Enviar para Lista (${listMembers?.length || 0})`}
          </Button>
        </div>

        {/* Contatos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Contatos</h4>
            {(listMembers?.length || 0) < 50 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("add-members")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {listMembers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contato na lista</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView("add-members")}
                    className="mt-2"
                  >
                    Adicionar Contatos
                  </Button>
                </div>
              ) : (
                listMembers?.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                          {member.name
                            ?.split(" ")
                            .map(n => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.phone}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removeMember.isPending}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // View: Adicionar membros
  if (view === "add-members") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("detail");
              setSelectedCustomers([]);
              setSearchQuery("");
            }}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Adicionar Contatos</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCustomers.length} selecionado(s)
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar contatos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {availableCustomers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum contato encontrado</p>
              </div>
            ) : (
              availableCustomers?.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => toggleCustomerSelection(customer.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={() => toggleCustomerSelection(customer.id)}
                  />
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {customer.name
                        ?.split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone || customer.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setView("detail");
              setSelectedCustomers([]);
              setSearchQuery("");
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedCustomers.length === 0 || addMember.isPending}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar{" "}
            {selectedCustomers.length > 0 && `(${selectedCustomers.length})`}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
