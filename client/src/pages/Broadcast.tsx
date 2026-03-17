import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { BroadcastListManager } from "@/components/BroadcastListManager";

export default function BroadcastPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de Transmissão</h1>
          <p className="text-muted-foreground">
            Crie listas e envie mensagens em massa via WhatsApp
          </p>
        </div>

        {/* Gerenciador de Listas de Broadcast */}
        <BroadcastListManager onClose={() => {}} />
      </div>
    </DashboardLayout>
  );
}
