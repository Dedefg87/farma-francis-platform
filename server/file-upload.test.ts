import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationsRouter, messagesRouter } from './routers-conversations';
import * as storage from './storage';

// Mock do storage
vi.mock('./storage', () => ({
  storagePut: vi.fn(),
}));

// Mock do getDb
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('File Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile mutation', () => {
    it('deve validar tamanho máximo de arquivo (16MB)', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, assignedTo: 1, status: 'assigned' }
        ]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const input = {
        conversation_id: 1,
        fileName: 'large-file.jpg',
        fileType: 'image/jpeg',
        fileSize: 17 * 1024 * 1024, // 17MB (acima do limite)
        fileData: 'base64data',
      };

      try {
        await messagesRouter.createCaller(mockContext as any).uploadFile(input);
        expect.fail('Deveria ter lançado erro');
      } catch (error: unknown) {
        expect(error.message).toContain('Arquivo muito grande');
      }
    });

    it('deve fazer upload de arquivo válido para S3', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, assignedTo: 1, status: 'assigned' }
        ]),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const mockStorageUrl = 'https://s3.example.com/file.jpg';
      vi.mocked(storage.storagePut).mockResolvedValue({
        key: 'chat-files/1/123456.jpg',
        url: mockStorageUrl,
      });

      const input = {
        conversation_id: 1,
        fileName: 'test-image.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024 * 1024, // 1MB
        fileData: Buffer.from('fake image data').toString('base64'),
      };

      const result = await messagesRouter.createCaller(mockContext as any).uploadFile(input);

      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe(mockStorageUrl);
      expect(result.fileName).toBe('test-image.jpg');
      expect(result.fileType).toBe('image/jpeg');
      expect(result.fileSize).toBe(1024 * 1024);
      expect(storage.storagePut).toHaveBeenCalledWith(
        expect.stringContaining('chat-files/1/'),
        expect.any(Buffer),
        'image/jpeg'
      );
    });

    it('deve verificar permissão do agente antes de fazer upload', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Nenhuma conversa encontrada
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const input = {
        conversation_id: 999,
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        fileData: 'base64data',
      };

      try {
        await messagesRouter.createCaller(mockContext as any).uploadFile(input);
        expect.fail('Deveria ter lançado erro');
      } catch (error: unknown) {
        expect(error.message).toContain('Conversa não encontrada ou sem permissão');
      }
    });
  });

  describe('send mutation com arquivo', () => {
    it('deve enviar mensagem com arquivo anexado', async () => {
      const mockContext = {
        user: { id: 1, email: 'agent@test.com', role: 'user' as const },
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, assignedTo: 1, status: 'assigned' }
        ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 123 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const input = {
        conversation_id: 1,
        content: 'Aqui está o documento',
        fileUrl: 'https://s3.example.com/file.pdf',
        fileName: 'documento.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      };

      const result = await messagesRouter.createCaller(mockContext as any).send(input);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(123);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Aqui está o documento',
          fileUrl: 'https://s3.example.com/file.pdf',
          fileName: 'documento.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        })
      );
    });
  });
});
