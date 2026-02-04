import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quickRepliesRouter } from './routers-quick-replies';
import { pausesRouter } from './routers-pauses';

// Mock do getDb
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('Quick Replies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('deve listar todas as respostas rápidas', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockReplies = [
        {
          id: 1,
          title: 'Saudação',
          content: 'Olá! Como posso ajudar?',
          category: 'saudacao',
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockReplies),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await quickRepliesRouter.createCaller(mockContext as any).list();

      expect(result).toEqual(mockReplies);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('deve filtrar respostas por busca', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      await quickRepliesRouter.createCaller(mockContext as any).list({
        search: 'saudação',
      });

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve criar nova resposta rápida', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await quickRepliesRouter.createCaller(mockContext as any).create({
        title: 'Nova Resposta',
        content: 'Conteúdo da resposta',
        category: 'informacao',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(1);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nova Resposta',
          content: 'Conteúdo da resposta',
          category: 'informacao',
          createdBy: 1,
        })
      );
    });
  });
});

describe('Agent Pauses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('deve iniciar pausa com sucesso', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Nenhuma pausa ativa
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await pausesRouter.createCaller(mockContext as any).start({
        pauseType: 'lunch',
        durationMinutes: 60,
      });

      expect(result.success).toBe(true);
      expect(result.pauseId).toBe(1);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 1,
          pauseType: 'lunch',
          durationMinutes: 60,
          status: 'active',
        })
      );
    });

    it('deve impedir iniciar pausa se já existe pausa ativa', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

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
        limit: vi.fn().mockResolvedValue([activePause]), // Pausa ativa existente
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      try {
        await pausesRouter.createCaller(mockContext as any).start({
          pauseType: 'snack',
          durationMinutes: 15,
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('já tem uma pausa ativa');
      }
    });
  });

  describe('end', () => {
    it('deve finalizar pausa ativa', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

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
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await pausesRouter.createCaller(mockContext as any).end();

      expect(result.success).toBe(true);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('deve retornar erro se não houver pausa ativa', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Nenhuma pausa ativa
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      try {
        await pausesRouter.createCaller(mockContext as any).end();
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('Nenhuma pausa ativa encontrada');
      }
    });
  });

  describe('getActive', () => {
    it('deve retornar pausa ativa do agente', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const activePause = {
        id: 1,
        agentId: 1,
        pauseType: 'snack',
        status: 'active',
        startedAt: new Date(),
        durationMinutes: 15,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([activePause]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await pausesRouter.createCaller(mockContext as any).getActive();

      expect(result).toEqual(activePause);
    });

    it('deve retornar null se não houver pausa ativa', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await pausesRouter.createCaller(mockContext as any).getActive();

      expect(result).toBeNull();
    });
  });
});
