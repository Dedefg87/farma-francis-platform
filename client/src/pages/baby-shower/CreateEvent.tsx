import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, ArrowLeft, Calendar, Baby, Target, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  motherName: string;
  motherPhone: string;
  eventName: string;
  expectedDueDate: string;
  eventDate: string;
  targetAmount: string;
  message: string;
}

export default function CreateEvent() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<FormData>({
    motherName: "",
    motherPhone: "",
    eventName: "",
    expectedDueDate: "",
    eventDate: "",
    targetAmount: "",
    message: "",
  });

  const createMutation = trpc.babyShower.createEvent.useMutation({
    onSuccess: (data) => {
      toast.success("Evento criado com sucesso!");
      navigate(`/baby-shower/manage/${data.eventId}`);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.motherName || !formData.motherPhone) {
      toast.error("Nome e telefone da mãe sao obrigatorios");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.eventName) {
      toast.error("Nome do evento e obrigatorio");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleCreate = () => {
    if (!validateStep2()) return;

    createMutation.mutate({
      motherCustomerId: 1,
      eventName: formData.eventName,
      expectedDueDate: formData.expectedDueDate || undefined,
      eventDate: formData.eventDate || undefined,
      targetAmount: formData.targetAmount ? parseFloat(formData.targetAmount) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Baby className="w-6 h-6 text-pink-500" />
              <span className="text-xl font-bold text-pink-600">Farma Francis</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-pink-600" />
            </div>
            <CardTitle className="text-2xl">Criar Cha de Bebe</CardTitle>
            <CardDescription>
              {step === 1 ? "Primeiro, vamos conhecer a mamae" : "Agora os detalhes do evento"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <Label>Nome da Mamae *</Label>
                  <Input
                    placeholder="Ex: Maria Silva"
                    value={formData.motherName}
                    onChange={(e) => handleChange("motherName", e.target.value)}
                  />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(11) 98765-4321"
                    value={formData.motherPhone}
                    onChange={(e) => handleChange("motherPhone", e.target.value)}
                  />
                </div>
                <Button className="w-full bg-pink-500 hover:bg-pink-600" onClick={handleNext}>
                  Proximo <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Nome do Evento *</Label>
                  <Input
                    placeholder="Ex: Cha da Maria"
                    value={formData.eventName}
                    onChange={(e) => handleChange("eventName", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data do Parto</Label>
                    <Input
                      type="date"
                      value={formData.expectedDueDate}
                      onChange={(e) => handleChange("expectedDueDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data do Evento</Label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => handleChange("eventDate", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Meta de Arrecadacao (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 500"
                    value={formData.targetAmount}
                    onChange={(e) => handleChange("targetAmount", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mensagem para Convidados</Label>
                  <Textarea
                    placeholder="Escreva uma mensagem especial..."
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                  </Button>
                  <Button 
                    className="flex-1 bg-pink-500 hover:bg-pink-600" 
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Evento"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
