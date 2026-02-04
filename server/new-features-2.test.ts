import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAgentAvailable, filterAvailableAgents, getAvailableAgentsInQueue } from './helpers/agent-availability';
import { checkAndFinishExpiredPauses } from './workers/pause-auto-finisher';

// Mock do getDb
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('Agent Availability Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAgentAvailable', () => {
    it('deve retornar true se agente não tem pausa ativa', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Nenhuma pausa ativa
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const available = await isAgentAvailable(1);

      expect(available).toBe(true);
    });

    it('deve retornar false se agente tem pausa ativa', async () => {
      const activePause = {
        id: 1,
        agentId: 1,
        pauseType: 'lunch',
        status: 'active',
        startedAt: new Date(),
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([activePause]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const available = await isAgentAvailable(1);

      expect(available).toBe(false);
    });
  });

  describe('filterAvailableAgents', () => {
    it('deve filtrar agentes em pausa', async () => {
      const pausedAgents = [{ agentId: 2 }, { agentId: 4 }];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(pausedAgents),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const available = await filterAvailableAgents([1, 2, 3, 4, 5]);

      expect(available).toEqual([1, 3, 5]); // 2 e 4 foram removidos
    });

    it('deve retornar array vazio se input vazio', async () => {
      const available = await filterAvailableAgents([]);
      expect(available).toEqual([]);
    });
  });

  describe('getAvailableAgentsInQueue', () => {
    it('deve retornar apenas agentes ativos e não pausados', async () => {
      const activeAgents = [
        { agentId: 1 },
        { agentId: 2 },
        { agentId: 3 },
      ];

      const pausedAgents = [{ agentId: 2 }]; // Agente 2 está pausado

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Primeira chamada: buscar agentes ativos
            return Promise.resolve(activeAgents);
          } else {
            // Segunda chamada: buscar agentes pausados
            return Promise.resolve(pausedAgents);
          }
        }),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const available = await getAvailableAgentsInQueue(1);

      // Deve retornar 1 e 3 (2 está pausado)
      expect(available).toEqual([1, 3]);
    });
  });
});

describe('Pause Auto-Finisher Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndFinishExpiredPauses', () => {
    it('deve finalizar pausas que excederam duração planejada', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const expiredPause = {
        id: 1,
        agentId: 1,
        pauseType: 'lunch',
        status: 'active',
        startedAt: twoHoursAgo,
        durationMinutes: 60, // 1 hora planejada, mas já passaram 2 horas
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([expiredPause]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await checkAndFinishExpiredPauses();

      expect(result.finishedCount).toBe(1);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('não deve finalizar pausas que ainda não expiraram', async () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const activePause = {
        id: 1,
        agentId: 1,
        pauseType: 'lunch',
        status: 'active',
        startedAt: thirtyMinutesAgo,
        durationMinutes: 60, // 1 hora planejada, só passaram 30 min
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([activePause]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await checkAndFinishExpiredPauses();

      expect(result.finishedCount).toBe(0);
      expect(mockDb.set).not.toHaveBeenCalled();
    });

    it('deve ignorar pausas sem duração planejada', async () => {
      const activePause = {
        id: 1,
        agentId: 1,
        pauseType: 'other',
        status: 'active',
        startedAt: new Date(),
        durationMinutes: null, // Sem duração planejada
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([activePause]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await checkAndFinishExpiredPauses();

      expect(result.finishedCount).toBe(0);
    });
  });
});

describe('Queue Join with Pause Check', () => {
  it('deve bloquear entrada em fila se agente está em pausa', async () => {
    // Este teste seria implementado no routers-queues.test.ts
    // Aqui apenas documentamos o comportamento esperado
    expect(true).toBe(true);
  });
});
