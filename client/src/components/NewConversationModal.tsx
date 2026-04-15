import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Keyboard, Search, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewConversationModal({
  open,
  onOpenChange,
  onSuccess,
}: NewConversationModalProps) {
  const [mode, setMode] = useState<"input" | "search" | null>(null);
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoFetchedName, setAutoFetchedName] = useState<string | null>(null);
  const [channel, setChannel] = useState<"whatsapp" | "instagram">("whatsapp");

  // Normalizar número brasileiro
  const normalizePhoneNumber = (value: string): string => {
    let cleaned = value.replace(/\D/g, "");
    if (!cleaned?.startsWith?.("55")) {
      cleaned = "55" + cleaned;
    }
    if (cleaned.length === 13 && cleaned?.startsWith?.("55")) {
      cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
    }
    return "+" + cleaned;
  };

  const { data: customers } = trpc.customers.search.useQuery(
    { query: searchQuery },
    { enabled: mode === "search" && searchQuery.length > 0 }
  );

  // Mutation para buscar nome automaticamente
  const fetchContactInfoMutation =
    trpc.contactFetch.fetchContactInfo.useMutation({
      onSuccess: data => {
        setAutoFetchedName(data.name);
        toast.success(`Nome encontrado: ${data.name}`);
      },
      onError: () => {
        // Esperado falhar às vezes
      },
    });

  const createConversationMutation = trpc.conversations.create.useMutation({
    onSuccess: () => {
      setPhoneOrEmail("");
      setSearchQuery("");
      setMode(null);
      setAutoFetchedName(null);
      onOpenChange(false);
      onSuccess();
      toast.success("Conversa criada com sucesso!");
    },
    onError: error => {
      toast.error(`Erro ao criar conversa: ${error.message}`);
      console.error("[NewConversation] Erro:", error);
    },
  });

  // Buscar nome automaticamente quando digitar telefone
  useEffect(() => {
    if (phoneOrEmail.length > 5 && mode === "input" && channel === "whatsapp") {
      const timer = setTimeout(() => {
        fetchContactInfoMutation.mutate({
          identifier: phoneOrEmail.trim(),
          channel,
        });
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setAutoFetchedName(null);
    }
  }, [phoneOrEmail, channel, mode]);

  // Criar conversa digitando número — backend faz lookup/criação do cliente
  const handleCreateWithInput = async () => {
    if (!phoneOrEmail.trim()) return;

    let finalPhone = phoneOrEmail.trim();
    if (channel === "whatsapp") {
      finalPhone = normalizePhoneNumber(phoneOrEmail);
    }

    // Backend conversoes.create agora aceita customerPhone e faz findOrCreate internamente
    createConversationMutation.mutate({
      customerPhone: finalPhone,
      customerName: autoFetchedName || undefined,
      channel,
    });
  };

  // Criar conversa selecionando cliente existente
  const handleSelectCustomer = (customerId: string) => {
    const customer = customers?.find((c: any) => String(c.id) === String(customerId));
    createConversationMutation.mutate({
      customerId: String(customerId),
      customerPhone: customer?.phone || undefined,
      customerName: customer?.name || undefined,
      channel,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full sm:max-w-md mx-4 z-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Nova Conversa</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {mode === null ? (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setMode("input")}
            >
              <Keyboard className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Digitar número / email</div>
                <div className="text-sm text-gray-500">
                  Iniciar conversa com contato
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setMode("search")}
            >
              <Search className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Buscar nos contatos</div>
                <div className="text-sm text-gray-500">
                  Encontrar cliente existente
                </div>
              </div>
            </Button>
          </div>
        ) : mode === "input" ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(null)}
              className="mb-2"
            >
              ← Voltar
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <select
                  id="channel"
                  value={channel}
                  onChange={e => setChannel(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">
                  {channel === "whatsapp"
                    ? "Número de telefone"
                    : "Username do Instagram"}
                </Label>
                <div className="relative">
                  {channel === "whatsapp" && (
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">
                      +55
                    </span>
                  )}
                  <Input
                    id="contact"
                    placeholder={
                      channel === "whatsapp"
                        ? "(DDD) 9xxxx-xxxx"
                        : "@username"
                    }
                    value={phoneOrEmail}
                    onChange={e => setPhoneOrEmail(e.target.value)}
                    onKeyDown={e =>
                      e.key === "Enter" && handleCreateWithInput()
                    }
                    className={channel === "whatsapp" ? "pl-12" : ""}
                  />
                  {fetchContactInfoMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-gray-400" />
                  )}
                </div>
                {autoFetchedName && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <span>✓</span>
                    <span>
                      Nome encontrado: <strong>{autoFetchedName}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleCreateWithInput}
              disabled={
                !phoneOrEmail.trim() || createConversationMutation.isPending
              }
              className="w-full"
            >
              {createConversationMutation.isPending
                ? "Criando..."
                : "Iniciar Conversa"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(null)}
              className="mb-2"
            >
              ← Voltar
            </Button>

            <div className="space-y-2">
              <Label htmlFor="search">Buscar cliente</Label>
              <Input
                id="search"
                placeholder="Digite nome, telefone ou email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {customers && customers.length > 0 ? (
                customers.map((customer: any) => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSelectCustomer(String(customer.id))}
                    disabled={createConversationMutation.isPending}
                  >
                    <div className="text-left">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {customer.phone || customer.email}
                      </div>
                    </div>
                  </Button>
                ))
              ) : searchQuery.length > 0 ? (
                <div className="text-center text-gray-500 py-4">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Digite para buscar clientes
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
