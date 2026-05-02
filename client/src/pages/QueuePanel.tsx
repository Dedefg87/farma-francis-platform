import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pause, Coffee, Utensils, Clock, Play } from 'lucide-react';
import PauseModal from '@/components/PauseModal';
import AgentTopBar from '@/components/AgentTopBar';

// Mensagens motivacionais que mudam a cada dia
const motivationalQuotes = [
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "Acredite em você mesmo e tudo será possível.", author: "Anônimo" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "Não espere por uma crise para descobrir o que é importante em sua vida.", author: "Platão" },
  { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Albert Einstein" },
  { text: "Seja a mudança que você deseja ver no mundo.", author: "Mahatma Gandhi" },
  { text: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", author: "Eleanor Roosevelt" },
];

export default function QueuePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: queues, isLoading: queuesLoading } = trpc.queues.list.useQuery(undefined, {
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });
  const joinQueue = trpc.queues.join.useMutation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyQuote, setDailyQuote] = useState(motivationalQuotes[0]);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseElapsedTime, setPauseElapsedTime] = useState(0);

  const { data: activePause, refetch: refetchPause } = trpc.pauses.getActive.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const endPause = trpc.pauses.end.useMutation();

  // Atualizar hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Selecionar mensagem baseada no dia do ano
  useEffect(() => {
    const dayOfYear = Math.floor((currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    setDailyQuote(motivationalQuotes[quoteIndex]);
  }, [currentTime.getDate()]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleEndPause = async () => {
    try {
      await endPause.mutateAsync();
      toast({
        title: 'Pausa finalizada',
        description: 'Você está ativo novamente e pode receber atendimentos.',
      });
      refetchPause();
    } catch (error: unknown) {
      toast({
        title: 'Erro ao finalizar pausa',
        description: error.message || 'Não foi possível finalizar a pausa.',
        variant: 'destructive',
      });
    }
  };

  // Calcular tempo decorrido da pausa
  useEffect(() => {
    if (!activePause) {
      setPauseElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - new Date(activePause.startedAt).getTime()) / 1000);
      setPauseElapsedTime(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activePause]);

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPauseLabel = (type: string) => {
    const labels: Record<string, string> = {
      lunch: 'Almoço',
      snack: 'Lanche',
      bathroom: 'Banheiro',
      other: 'Outro',
    };
    return labels[type] || type;
  };

  return (
    <>
      <AgentTopBar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header com boas-vindas e relógio */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo, {user?.name || 'Agente'}!
            </h1>
            <p className="text-gray-600">
              Painel de Filas - Gerencie seus atendimentos
            </p>
          </div>

          {/* Relógio e Mensagem Motivacional */}
          <Card className="p-6 bg-white shadow-lg min-w-[320px]">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-[#D32F2F]" />
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-sm italic text-gray-700 leading-relaxed">
                "{dailyQuote.text}"
              </p>
              <p className="text-xs text-gray-500 mt-2 text-right">
                - {dailyQuote.author}
              </p>
            </div>
          </Card>
        </div>

        {/* Status e Botão de Pausa */}
        <div className="mb-6">
          {activePause ? (
            <Card className="p-4 bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold text-orange-900">
                      Em Pausa: {getPauseLabel(activePause.pauseType)}
                    </p>
                    <p className="text-sm text-orange-700">
                      Tempo decorrido: {formatElapsedTime(pauseElapsedTime)}
                      {activePause.durationMinutes && (
                        <span> / {activePause.durationMinutes} min</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleEndPause}
                  disabled={endPause.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4" />
                  Retomar
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              onClick={() => setShowPauseModal(true)}
              variant="outline"
              className="gap-2 bg-white hover:bg-gray-50"
            >
              <Pause className="h-4 w-4" />
              Iniciar Pausa
            </Button>
          )}
        </div>

        {/* Modal de Pausa */}
        <PauseModal
          open={showPauseModal}
          onClose={() => setShowPauseModal(false)}
          onPauseStarted={() => refetchPause()}
        />

        {/* Lista de Filas */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Filas Disponíveis
          </h2>
          
          {queuesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F]"></div>
            </div>
          ) : queues && queues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queues.map((queue) => (
                <Card key={queue.id} className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {queue.name}
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      {queue.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {queue.description && (
                    <p className="text-sm text-gray-600 mb-4">{queue.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Aguardando:</span>
                      <span className="font-semibold">{queue.stats.waiting}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Em atendimento:</span>
                      <span className="font-semibold">{queue.stats.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agentes online:</span>
                      <span className="font-semibold">{queue.stats.agentsOnline}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4 bg-[#D32F2F] hover:bg-[#B71C1C]"
                    onClick={() => {
                      joinQueue.mutate({ queueId: queue.id }, {
                        onSuccess: () => {
                          toast({
                            title: "Sucesso!",
                            description: `Você entrou na fila: ${queue.name}`,
                          });
                        },
                        onError: (error) => {
                          toast({
                            title: "Erro",
                            description: `Erro ao entrar na fila: ${error.message}`,
                            variant: "destructive",
                          });
                        }
                      });
                    }}
                    disabled={joinQueue.isPending}
                  >
                    {joinQueue.isPending ? 'Entrando...' : 'Entrar na Fila'}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 bg-white text-center">
              <p className="text-gray-500">Nenhuma fila disponível no momento.</p>
            </Card>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
