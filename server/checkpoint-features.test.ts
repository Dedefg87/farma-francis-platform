import { describe, it, expect } from 'vitest';
import { getDateRangeFromPeriod } from './utils/date-range';

describe('Checkpoint - Novas Funcionalidades', () => {
  describe('1. Correção de Erro 404 em /automation', () => {
    it('deve ter removido a rota /automation do App.tsx', () => {
      const fs = require('fs');
      const appContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/client/src/App.tsx', 'utf-8');
      
      expect(appContent).toContain('// import Automation from');
      expect(appContent).toContain('{/* <Route path={"/automation"}>');
    });

    it('deve ter removido o link de Automação do TopBar', () => {
      const fs = require('fs');
      const topBarContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/client/src/components/TopBar.tsx', 'utf-8');
      
      expect(topBarContent).toContain('// { icon: Zap, label: "Automação", path: "/automation" }');
    });
  });

  describe('2. Busca Automática de Nome de Contato', () => {
    it('deve ter criado o router de busca de contato', () => {
      const fs = require('fs');
      const routerExists = fs.existsSync('/home/ubuntu/farma-francis-platform/server/routers-contact-fetch.ts');
      
      expect(routerExists).toBe(true);
    });

    it('deve ter endpoints para WhatsApp e Instagram', () => {
      const fs = require('fs');
      const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-contact-fetch.ts', 'utf-8');
      
      expect(routerContent).toContain('fetchWhatsAppName');
      expect(routerContent).toContain('fetchInstagramName');
      expect(routerContent).toContain('fetchContactInfo');
    });

    it('deve ter integrado no NewConversationModal', () => {
      const fs = require('fs');
      const modalContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/client/src/components/NewConversationModal.tsx', 'utf-8');
      
      expect(modalContent).toContain('fetchContactInfoMutation');
      expect(modalContent).toContain('autoFetchedName');
    });
  });

  describe('3. Filtros de Período no Dashboard', () => {
    it('deve calcular range correto para "hoje"', () => {
      const { start, end } = getDateRangeFromPeriod('hoje');
      
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(end).toBeInstanceOf(Date);
    });

    it('deve calcular range correto para "semana"', () => {
      const { start } = getDateRangeFromPeriod('semana');
      
      expect(start.getDay()).toBe(0); // Domingo
      expect(start.getHours()).toBe(0);
    });

    it('deve ter adicionado input de período nos endpoints', () => {
      const fs = require('fs');
      const statsContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-stats.ts', 'utf-8');
      
      expect(statsContent).toContain('getDateRangeFromPeriod');
      expect(statsContent).toContain('period: z.string().optional()');
    });

    it('deve passar período para queries no Dashboard', () => {
      const fs = require('fs');
      const dashboardContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/client/src/pages/Dashboard.tsx', 'utf-8');
      
      expect(dashboardContent).toContain('{ period: selectedPeriod }');
    });
  });
});
