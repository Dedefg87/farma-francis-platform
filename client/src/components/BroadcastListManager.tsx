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
  const [messageContent, setMessageContent] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);

  // Queries
  const { data: lists, refetch: refetchLists } = trpc.broadcast.list.useQuery();
  const { data: listDetail, refetch: refetchDetail } =
    trpc.broadcast.getById.useQuery(
      { listId: selectedListId! },
      { enabled: selectedListId !== null && view === "detail" }
    );
  const { data: availableCustomers } = trpc.broadcast.searchCustomers.useQuery(
    { query: searchQuery, excludeListId: selectedListId || undefined },
    { enabled: view === "add-members" }
  );

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
      refetchLists();
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
    onSuccess: data => {
      toast.success(`Mensagem enviada para ${data.totalRecipients} contatos!`);
      setMessageContent("");
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

      setFileAttachment({
        url: data.fileUrl,
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

  const handleSendMessage = () => {
    if (!messageContent.trim() && !fileAttachment) {
      toast.error("Digite uma mensagem ou anexe um arquivo");
      return;
    }

    sendMessage.mutate({
      listId: selectedListId!,
      content: messageContent,
      ...(fileAttachment && {
        fileUrl: fileAttachment.url,
        fileName: fileAttachment.name,
        fileType: fileAttachment.type,
        fileSize: fileAttachment.size,
      }),
    });

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
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Listas de Transmissão</h3>
            <p className="text-sm text-muted-foreground">
              Crie listas com até 50 contatos para enviar mensagens em massa
            </p>
          </div>
          <Button onClick={() => setView("create")}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Lista
          </Button>
        </div>

        <div className="space-y-2">
          {lists?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma lista criada</p>
              <p className="text-sm">Crie sua primeira lista de transmissão</p>
            </div>
          ) : (
            lists?.map(list => (
              <button
                key={list.id}
                onClick={() => {
                  setSelectedListId(list.id);
                  setView("detail");
                }}
                className="w-full text-left p-4 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{list.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {list.memberCount} contato
                        {list.memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
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
                {listDetail.members?.length || 0} de 50 contatos
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
              : `Enviar para Lista (${listDetail?.members?.length || 0})`}
          </Button>
        </div>

        {/* Contatos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Contatos</h4>
            {(listDetail.members?.length || 0) < 50 && (
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
              {listDetail.members?.length === 0 ? (
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
                listDetail.members?.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                          {member.customerName
                            ?.split(" ")
                            .map(n => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.customerPhone}
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
