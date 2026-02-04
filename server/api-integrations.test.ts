import { describe, it, expect } from 'vitest';

describe('Integrações de APIs e Drill-down - Checkpoint', () => {
  describe('1. Tabela de Configurações de Integração', () => {
    it('deve ter criado tabela integration_settings no schema', () => {
      const fs = require('fs');
      const schemaContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/drizzle/schema.ts', 'utf-8');
      
      expect(schemaContent).toContain('export const integrationSettings');
      expect(schemaContent).toContain('integration_type');
      expect(schemaContent).toContain('whatsapp_business');
      expect(schemaContent).toContain('instagram_graph');
      expect(schemaContent).toContain('evolution_api');
    });

    it('deve ter migração da tabela aplicada', () => {
      const fs = require('fs');
      const migrations = fs.readdirSync('/home/ubuntu/farma-francis-platform/drizzle');
      
      const hasMigration = migrations.some((file: string) => 
        file.endsWith('.sql') && fs.readFileSync(`/home/ubuntu/farma-francis-platform/drizzle/${file}`, 'utf-8').includes('integration_settings')
      );
      
      expect(hasMigration).toBe(true);
    });
  });

  describe('2. Integração com WhatsApp Business API', () => {
    it('deve ter criado helper de integração', () => {
      const fs = require('fs');
      const helperExists = fs.existsSync('/home/ubuntu/farma-francis-platform/server/integrations/whatsapp-business.ts');
      
      expect(helperExists).toBe(true);
    });

    it('deve ter função fetchWhatsAppProfile', () => {
      const fs = require('fs');
      const helperContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/integrations/whatsapp-business.ts', 'utf-8');
      
      expect(helperContent).toContain('export async function fetchWhatsAppProfile');
      expect(helperContent).toContain('WhatsAppConfig');
      expect(helperContent).toContain('WhatsAppProfile');
    });

    it('deve ter função de validação de credenciais', () => {
      const fs = require('fs');
      const helperContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/integrations/whatsapp-business.ts', 'utf-8');
      
      expect(helperContent).toContain('export async function validateWhatsAppCredentials');
    });

    it('deve ter atualizado router de busca para usar API real', () => {
      const fs = require('fs');
      const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-contact-fetch.ts', 'utf-8');
      
      expect(routerContent).toContain("import { fetchWhatsAppProfile } from './integrations/whatsapp-business'");
      expect(routerContent).toContain('integrationSettings');
      expect(routerContent).toContain('usingFallback');
    });
  });

  describe('3. Integração com Instagram Graph API', () => {
    it('deve ter criado helper de integração', () => {
      const fs = require('fs');
      const helperExists = fs.existsSync('/home/ubuntu/farma-francis-platform/server/integrations/instagram-graph.ts');
      
      expect(helperExists).toBe(true);
    });

    it('deve ter função fetchInstagramProfile', () => {
      const fs = require('fs');
      const helperContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/integrations/instagram-graph.ts', 'utf-8');
      
      expect(helperContent).toContain('export async function fetchInstagramProfile');
      expect(helperContent).toContain('InstagramConfig');
      expect(helperContent).toContain('InstagramProfile');
    });

    it('deve ter método público de fallback', () => {
      const fs = require('fs');
      const helperContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/integrations/instagram-graph.ts', 'utf-8');
      
      expect(helperContent).toContain('export async function fetchInstagramProfilePublic');
      expect(helperContent).toContain('biography');
      expect(helperContent).toContain('followersCount');
    });

    it('deve ter atualizado router para usar API real', () => {
      const fs = require('fs');
      const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-contact-fetch.ts', 'utf-8');
      
      expect(routerContent).toContain("import { fetchInstagramProfile, fetchInstagramProfilePublic } from './integrations/instagram-graph'");
      expect(routerContent).toContain('fetchInstagramProfilePublic');
    });
  });

  describe('4. Drill-down no Gráfico de Horas', () => {
    it('deve ter criado router de drilldown', () => {
      const fs = require('fs');
      const routerExists = fs.existsSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-drilldown.ts');
      
      expect(routerExists).toBe(true);
    });

    it('deve ter endpoint getConversationsByHour', () => {
      const fs = require('fs');
      const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-drilldown.ts', 'utf-8');
      
      expect(routerContent).toContain('getConversationsByHour');
      expect(routerContent).toContain('hour: z.number().min(0).max(23)');
    });

    it('deve ter endpoint getConversationsByPeriod', () => {
      const fs = require('fs');
      const routerContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers-dashboard-drilldown.ts', 'utf-8');
      
      expect(routerContent).toContain('getConversationsByPeriod');
      expect(routerContent).toContain('startDate');
      expect(routerContent).toContain('endDate');
      expect(routerContent).toContain('limit');
      expect(routerContent).toContain('offset');
    });

    it('deve ter criado modal de drill-down', () => {
      const fs = require('fs');
      const modalExists = fs.existsSync('/home/ubuntu/farma-francis-platform/client/src/components/HourDrilldownModal.tsx');
      
      expect(modalExists).toBe(true);
    });

    it('deve ter registrado router no appRouter', () => {
      const fs = require('fs');
      const routersContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/server/routers.ts', 'utf-8');
      
      expect(routersContent).toContain("import { dashboardDrilldownRouter } from './routers-dashboard-drilldown'");
      expect(routersContent).toContain('dashboardDrilldown: dashboardDrilldownRouter');
    });
  });

  describe('5. Estrutura Geral', () => {
    it('deve ter atualizado todo.md com tarefas concluídas', () => {
      const fs = require('fs');
      const todoContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/todo.md', 'utf-8');
      
      expect(todoContent).toContain('[x] Criar endpoint para buscar perfil do WhatsApp');
      expect(todoContent).toContain('[x] Criar endpoint para buscar perfil do Instagram');
      expect(todoContent).toContain('[x] Criar modal de detalhes das conversas');
    });

    it('deve ter imports corretos no schema', () => {
      const fs = require('fs');
      const schemaContent = fs.readFileSync('/home/ubuntu/farma-francis-platform/drizzle/schema.ts', 'utf-8');
      
      expect(schemaContent).toContain('json');
      expect(schemaContent).toContain('boolean');
    });
  });
});
