import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pill,
  Calendar,
  Plus,
  AlertCircle,
  Tag,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface CRMPanelProps {
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CRMPanel({
  customerId,
  customerName,
  customerPhone,
  open,
  onOpenChange,
}: CRMPanelProps) {
  const utils = (trpc as any).useUtils?.() as any;
  const [treatmentsShadow, setTreatmentsShadow] = useState<any[] | null>(null);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [showPurchaseItems, setShowPurchaseItems] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
    null
  );
  const [newTreatment, setNewTreatment] = useState({
    nomeMedicamento: "",
    posologiaDiaria: 1,
    qtdCaixa: 30,
    dataUltimaCompra: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const { data: customerData, refetch: refetchCustomer } = (
    trpc as any
  ).crm.getCustomerFullData.useQuery(
    { customerId: customerId! },
    {
      enabled: !!customerId && open,
      onError: (error: any) => {
        toast.error(`Erro ao carregar CRM: ${error.message}`);
      },
    }
  );

  const { data: scripts } = (trpc as any).crm.getScripts.useQuery(undefined, {
    enabled: open,
  });

  const { data: allTags = [] } = (trpc as any).crm.getTags.useQuery(undefined, {
    enabled: open,
    onError: (error: any) => {
      toast.error(`Erro ao carregar tags: ${error.message}`);
    },
  });

  const updateCustomerMutation = (trpc as any).crm.updateCustomer.useMutation({
    onSuccess: () => {
      toast.success("Dados do cliente atualizados");
      refetchCustomer();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });

  const [birthDate, setBirthDate] = useState<string>("");

  // Sync birthday field
  React.useEffect(() => {
    const bd = (customerData as any)?.birthDate;
    if (!bd) {
      setBirthDate("");
      return;
    }
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) {
      setBirthDate("");
      return;
    }
    setBirthDate(d.toISOString().split("T")[0]);
  }, [customerData]);

  const { data: purchases = [] } = (
    trpc as any
  ).crm.pharma.listPurchasesByCustomer.useQuery(
    { customerId: customerId!, limit: 10 },
    { enabled: !!customerId && open }
  );

  const { data: purchaseItems = [] } = (
    trpc as any
  ).crm.pharma.listPurchaseItems.useQuery(
    { purchaseId: selectedPurchaseId! },
    { enabled: !!selectedPurchaseId && open && showPurchaseItems }
  );

  const createTreatmentMutation = (trpc as any).crm.createTreatment.useMutation(
    {
      onSuccess: (data: any) => {
        toast.success("Tratamento adicionado com sucesso");
        setShowAddTreatment(false);
        setNewTreatment({
          nomeMedicamento: "",
          posologiaDiaria: 1,
          qtdCaixa: 30,
          dataUltimaCompra: new Date().toISOString().split("T")[0],
          observacoes: "",
        });
        if (data?.treatment) {
          const prev =
            treatmentsShadow ?? (customerData as any)?.treatments ?? [];
          setTreatmentsShadow([data.treatment, ...prev]);
        }

        try {
          utils?.crm?.getCustomerFullData?.invalidate?.({ customerId });
        } catch {
          // ignore
        }
        refetchCustomer().catch?.(() => {});
      },
      onError: (error: any) => {
        toast.error(`Erro ao adicionar tratamento: ${error.message}`);
      },
    }
  );

  const treatments =
    treatmentsShadow ?? (customerData as any)?.treatments ?? ([] as any[]);

  const selectedTagsRaw = ((customerData as any)?.tags ?? []) as any[];
  const selectedTags = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of selectedTagsRaw) {
      const key = String(t?.name || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!m.has(key)) m.set(key, t);
    }
    return Array.from(m.values());
  }, [selectedTagsRaw]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const list = ((allTags as any[]) ?? []) as any[];
    const base = q
      ? list.filter((t: any) =>
          `${t.name || ""} ${t.description || ""}`.toLowerCase().includes(q)
        )
      : list;

    // Dedupe by name to avoid legacy duplicates
    const m = new Map<string, any>();
    for (const t of base) {
      const key = String(t?.name || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!m.has(key)) m.set(key, t);
    }
    return Array.from(m.values()).sort((a: any, b: any) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
    );
  }, [allTags, tagSearch]);

  React.useEffect(() => {
    // If server data already has treatments, drop shadow
    const serverTreatments = (customerData as any)?.treatments;
    if (Array.isArray(serverTreatments) && serverTreatments.length > 0) {
      setTreatmentsShadow(null);
    }
  }, [customerData]);

  const updateTreatmentMutation = (trpc as any).crm.updateTreatment.useMutation(
    {
      onSuccess: () => {
        toast.success("Tratamento atualizado");
        try {
          utils?.crm?.getCustomerFullData?.invalidate?.({ customerId });
        } catch {
          // ignore
        }
        refetchCustomer();
      },
      onError: (error: any) => {
        toast.error(`Erro ao atualizar: ${error.message}`);
      },
    }
  );

  const addTagMutation = (trpc as any).crm.addTagToCustomer.useMutation({
    onSuccess: () => {
      utils?.crm?.getCustomerFullData
        ?.invalidate?.({ customerId })
        .catch?.(() => {});
      refetchCustomer();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const removeTagMutation = (trpc as any).crm.removeTagFromCustomer.useMutation(
    {
      onSuccess: () => {
        utils?.crm?.getCustomerFullData
          ?.invalidate?.({ customerId })
          .catch?.(() => {});
        refetchCustomer();
      },
      onError: (error: any) => toast.error(error.message),
    }
  );

  const deleteTreatmentMutation = (trpc as any).crm.deleteTreatment.useMutation(
    {
      onSuccess: () => {
        toast.success("Tratamento removido");
        utils?.crm?.getCustomerFullData
          ?.invalidate?.({ customerId })
          .catch?.(() => {});
        refetchCustomer();
      },
      onError: (error: any) => toast.error(error.message),
    }
  );

  const duration = useMemo(() => {
    if (!newTreatment.qtdCaixa || !newTreatment.posologiaDiaria) return 0;
    return Math.floor(newTreatment.qtdCaixa / newTreatment.posologiaDiaria);
  }, [newTreatment.qtdCaixa, newTreatment.posologiaDiaria]);

  const endDate = useMemo(() => {
    if (!newTreatment.dataUltimaCompra || duration <= 0) return null;
    const date = addDays(new Date(newTreatment.dataUltimaCompra), duration);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }, [newTreatment.dataUltimaCompra, duration]);

  const handleAddTreatment = () => {
    if (!customerId || !newTreatment.nomeMedicamento) {
      toast.error("Preencha o nome do medicamento");
      return;
    }
    createTreatmentMutation.mutate({
      customerId,
      ...newTreatment,
    });
  };

  const handleUseScript = (template: string) => {
    const filled = template
      .replace("{nome}", customerName || "Cliente")
      .replace(
        "{remedio}",
        customerData?.treatments?.[0]?.nomeMedicamento || "seu medicamento"
      )
      .replace(
        "{data}",
        customerData?.treatments?.[0]?.dataFimPrevisto
          ? format(
              new Date(customerData.treatments[0].dataFimPrevisto),
              "dd/MM/yyyy",
              { locale: ptBR }
            )
          : "em breve"
      );

    navigator.clipboard.writeText(filled);
    toast.success("Texto copiado para área de transferência");
  };

  const openItems = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setShowPurchaseItems(true);
  };

  if (!customerId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            CRM - {customerName || "Cliente"}
          </DialogTitle>
          <DialogDescription>
            {customerPhone} • Gerencie tratamentos e tags
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dados do Cliente
            </h4>
            <Card className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-sm font-medium">Aniversario</label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 flex md:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!customerId) return;
                      updateCustomerMutation.mutate({
                        id: customerId,
                        birthDate: birthDate || "",
                      });
                    }}
                    disabled={updateCustomerMutation.isPending}
                  >
                    {updateCustomerMutation.isPending
                      ? "Salvando..."
                      : "Salvar"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Tags */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </h4>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {selectedTags.length > 0 ? (
                  <>
                    {selectedTags.slice(0, 6).map((tag: any) => (
                      <Badge
                        key={tag.id}
                        className="gap-2"
                        style={
                          tag.color ? { backgroundColor: tag.color } : undefined
                        }
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-white/80" />
                        <span>
                          {tag.name}
                          {tag.icon ? ` ${tag.icon}` : ""}
                        </span>
                      </Badge>
                    ))}
                    {selectedTags.length > 6 && (
                      <Badge variant="secondary">
                        +{selectedTags.length - 6}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    Nenhuma tag adicionada
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowTagsDialog(true)}
              >
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            </div>
          </div>

          {/* Tratamentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <Pill className="w-4 h-4" /> Tratamentos
              </h4>
              <Button size="sm" onClick={() => setShowAddTreatment(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {treatments.map((treatment: any) => {
                const daysLeft = treatment.dataFimPrevisto
                  ? Math.ceil(
                      (new Date(treatment.dataFimPrevisto).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <Card key={treatment.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {treatment.nomeMedicamento}
                        </p>
                        <p className="text-sm text-gray-500">
                          {treatment.posologiaDiaria}x/dia •{" "}
                          {treatment.qtdCaixa} comprimidos
                        </p>
                      </div>
                      <div className="text-right">
                        {daysLeft !== null && (
                          <Badge
                            variant={
                              daysLeft <= 3
                                ? "destructive"
                                : daysLeft <= 7
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {daysLeft > 0 ? `${daysLeft} dias` : "Acabando!"}
                          </Badge>
                        )}
                        {treatment.dataFimPrevisto && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fim:{" "}
                            {format(
                              new Date(treatment.dataFimPrevisto),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                        )}

                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-red-600"
                            title="Apagar"
                            onClick={() => {
                              if (!confirm("Apagar este tratamento?")) return;
                              setTreatmentsShadow(prev => {
                                const base = prev ?? treatments;
                                return (base as any[]).filter(
                                  (t: any) => t.id !== treatment.id
                                );
                              });
                              deleteTreatmentMutation.mutate({
                                id: treatment.id,
                              });
                            }}
                            disabled={deleteTreatmentMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {(!treatments || treatments.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum tratamento cadastrado
                </p>
              )}
            </div>
          </div>

          {/* Compras */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Compras Recentes
              </h4>
            </div>

            <div className="space-y-2">
              {(purchases as any[])?.slice(0, 5).map((p: any) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {p.purchaseDate
                          ? format(new Date(p.purchaseDate), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "-"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Canal: {p.channel || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        R$ {Number(p.totalValue || 0).toLocaleString("pt-BR")}
                      </Badge>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openItems(p.id)}
                        >
                          Ver itens
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {(!purchases || (purchases as any[]).length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhuma compra registrada
                </p>
              )}
            </div>
          </div>

          {/* Scripts Rápidos */}
          {scripts && scripts.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Scripts Rápidos</h4>
              <div className="grid grid-cols-1 gap-2">
                {scripts.map((script: any) => (
                  <Button
                    key={script.id}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => handleUseScript(script.template)}
                  >
                    <span className="text-xs text-gray-500 mr-2">
                      {script.name}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Dialog Adicionar Tratamento */}
      <Dialog open={showAddTreatment} onOpenChange={setShowAddTreatment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tratamento</DialogTitle>
            <DialogDescription>
              Adicione um medicamento para este cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Medicamento</label>
              <Input
                value={newTreatment.nomeMedicamento}
                onChange={e =>
                  setNewTreatment({
                    ...newTreatment,
                    nomeMedicamento: e.target.value,
                  })
                }
                placeholder="Nome do medicamento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Por dia</label>
                <Input
                  type="number"
                  min={1}
                  value={newTreatment.posologiaDiaria}
                  onChange={e =>
                    setNewTreatment({
                      ...newTreatment,
                      posologiaDiaria: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Qtd. caixa</label>
                <Input
                  type="number"
                  min={1}
                  value={newTreatment.qtdCaixa}
                  onChange={e =>
                    setNewTreatment({
                      ...newTreatment,
                      qtdCaixa: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Data da última compra
              </label>
              <Input
                type="date"
                value={newTreatment.dataUltimaCompra}
                onChange={e =>
                  setNewTreatment({
                    ...newTreatment,
                    dataUltimaCompra: e.target.value,
                  })
                }
              />
            </div>

            {duration > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Duração estimada: <strong>{duration} dias</strong>
                  {endDate && ` (acaba em ${endDate})`}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Observações</label>
              <Input
                value={newTreatment.observacoes}
                onChange={e =>
                  setNewTreatment({
                    ...newTreatment,
                    observacoes: e.target.value,
                  })
                }
                placeholder="Observações opcionais"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddTreatment(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddTreatment}
              disabled={createTreatmentMutation.isPending}
            >
              {createTreatmentMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Itens da Compra */}
      <Dialog open={showPurchaseItems} onOpenChange={setShowPurchaseItems}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Itens da compra</DialogTitle>
            <DialogDescription>
              Produtos registrados nesta compra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {(purchaseItems as any[])?.length > 0 ? (
              (purchaseItems as any[]).map((it: any) => (
                <Card key={it.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{it.productName}</p>
                      <p className="text-sm text-gray-500">
                        Qtd: {it.quantity}
                      </p>
                    </div>
                    <Badge variant="outline">
                      R$ {Number(it.price || 0).toLocaleString("pt-BR")}
                    </Badge>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                Nenhum item encontrado
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPurchaseItems(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tags */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tags do Cliente</DialogTitle>
            <DialogDescription>
              Selecione as tags para segmentar o cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                placeholder="Pesquisar tags..."
                className="pl-10"
              />
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      removeTagMutation.mutate({
                        customerId: customerId!,
                        tagId: t.id,
                      })
                    }
                    className="inline-flex"
                    title="Remover"
                    disabled={removeTagMutation.isPending}
                  >
                    <Badge
                      className="gap-2"
                      style={t.color ? { backgroundColor: t.color } : undefined}
                    >
                      {t.name}
                      {t.icon ? ` ${t.icon}` : ""}
                      <span className="opacity-80">x</span>
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
              {filteredTags.length > 0 ? (
                filteredTags.map((tag: any, idx: number) => {
                  const selected = selectedTags.some(
                    (t: any) => t.id === tag.id
                  );
                  const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={
                        "w-full text-left px-4 py-2.5 flex items-center justify-between border-b last:border-b-0 " +
                        bg
                      }
                      onClick={() => {
                        if (!customerId) return;
                        if (selected) {
                          removeTagMutation.mutate({
                            customerId,
                            tagId: tag.id,
                          });
                        } else {
                          addTagMutation.mutate({ customerId, tagId: tag.id });
                        }
                      }}
                      disabled={
                        addTagMutation.isPending || removeTagMutation.isPending
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color || "#cbd5e1" }}
                        />
                        <span className="font-medium">
                          {tag.name}
                          {tag.icon ? ` ${tag.icon}` : ""}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {selected ? "Selecionada" : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-sm text-gray-500 text-center">
                  Nenhuma tag encontrada
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
