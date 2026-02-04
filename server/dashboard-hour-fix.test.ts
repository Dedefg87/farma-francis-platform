import { describe, it, expect } from 'vitest';

/**
 * Testes para correção do erro SQL no endpoint getContactsByHour
 */

describe('Correção de Erro SQL - getContactsByHour', () => {
  it('deve ter corrigido query SQL usando db.execute', () => {
    const fs = require('fs');
    const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-stats.ts', 'utf-8');
    
    // Verifica que usa db.execute ao invés de db.select problemático
    expect(routerContent).toContain('db.execute');
    expect(routerContent).toContain('HOUR(opened_at)');
  });

  it('deve usar query raw SQL para HOUR()', () => {
    const fs = require('fs');
    const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-stats.ts', 'utf-8');
    
    // Verifica que a query está usando SQL raw
    expect(routerContent).toContain('SELECT');
    expect(routerContent).toContain('GROUP BY HOUR(opened_at)');
    expect(routerContent).toContain('ORDER BY HOUR(opened_at)');
  });

  it('deve retornar array com 24 horas', async () => {
    const { dashboardStatsRouter } = await import('./routers-dashboard-stats');
    
    // Criar caller mock para testar
    const caller = dashboardStatsRouter.createCaller({
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: null,
        loginMethod: 'google',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const result = await caller.getContactsByHour();
    
    // Deve retornar array com 24 elementos (uma para cada hora)
    expect(result).toHaveLength(24);
    
    // Cada elemento deve ter a estrutura correta
    expect(result[0]).toHaveProperty('hour');
    expect(result[0]).toHaveProperty('chats');
    expect(result[0]).toHaveProperty('calls');
    expect(result[0]).toHaveProperty('abandoned');
  });

  it('deve formatar horas corretamente (00h-23h)', async () => {
    const { dashboardStatsRouter } = await import('./routers-dashboard-stats');
    
    const caller = dashboardStatsRouter.createCaller({
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: null,
        loginMethod: 'google',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const result = await caller.getContactsByHour();
    
    // Verificar formato das horas
    expect(result[0].hour).toBe('00h');
    expect(result[12].hour).toBe('12h');
    expect(result[23].hour).toBe('23h');
  });

  it('deve preencher horas sem dados com zeros', async () => {
    const { dashboardStatsRouter } = await import('./routers-dashboard-stats');
    
    const caller = dashboardStatsRouter.createCaller({
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: null,
        loginMethod: 'google',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const result = await caller.getContactsByHour();
    
    // Todas as horas devem ter valores numéricos (mesmo que zero)
    result.forEach((hour) => {
      expect(typeof hour.chats).toBe('number');
      expect(typeof hour.calls).toBe('number');
      expect(typeof hour.abandoned).toBe('number');
      expect(hour.chats).toBeGreaterThanOrEqual(0);
      expect(hour.calls).toBeGreaterThanOrEqual(0);
      expect(hour.abandoned).toBeGreaterThanOrEqual(0);
    });
  });
});
