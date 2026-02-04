/**
 * Auditoria Automatizada de Interatividade
 * Verifica se todos os botões e links da aplicação possuem handlers funcionais
 * 
 * Execução: pnpm playwright test tests/button-audit.spec.ts
 */

import { test, expect } from '@playwright/test';

// Rotas a serem testadas
const routes = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/crm', name: 'CRM' },
  { path: '/tickets', name: 'Atendimentos' },
  { path: '/employees', name: 'Funcionários' },
  { path: '/reports', name: 'Relatórios' },
  { path: '/messages', name: 'Mensagens' },
  { path: '/automation', name: 'Automação' },
  { path: '/executions', name: 'Execuções' },
  { path: '/agent-performance', name: 'Performance de Agentes' },
  { path: '/settings/api', name: 'Configurações API' },
];

test.describe('Auditoria de Botões e Interatividade', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Adicionar login automático se necessário
    // await page.goto('http://localhost:3000/login');
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
  });

  for (const route of routes) {
    test(`Auditoria de botões em ${route.name}`, async ({ page }) => {
      // Navegar para a rota
      await page.goto(`http://localhost:3000${route.path}`);
      
      // Aguardar carregamento
      await page.waitForLoadState('networkidle');

      // Encontrar todos os botões visíveis e habilitados
      const buttons = await page.locator('button:visible:not(:disabled)').all();
      
      console.log(`\n📍 Rota: ${route.name} (${route.path})`);
      console.log(`   Total de botões encontrados: ${buttons.length}`);

      const deadButtons: string[] = [];

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const buttonText = await button.textContent();
        const buttonId = await button.getAttribute('id');
        const buttonClass = await button.getAttribute('class');
        
        const identifier = buttonText || buttonId || `button-${i}`;

        // Verificar se o botão tem event listeners
        const hasOnClick = await button.evaluate((el) => {
          // Verificar se tem onclick inline
          if (el.onclick) return true;
          
          // Verificar se tem event listeners registrados
          const listeners = (window as any).getEventListeners?.(el);
          if (listeners && listeners.click && listeners.click.length > 0) {
            return true;
          }

          // Verificar se está dentro de um form
          if (el.closest('form')) return true;

          // Verificar se tem atributo type="submit"
          if (el.getAttribute('type') === 'submit') return true;

          return false;
        });

        if (!hasOnClick) {
          deadButtons.push(identifier);
          console.log(`   ❌ Botão sem handler: "${identifier}"`);
        } else {
          console.log(`   ✅ Botão funcional: "${identifier}"`);
        }
      }

      // Verificar links
      const links = await page.locator('a:visible').all();
      console.log(`   Total de links encontrados: ${links.length}`);

      const deadLinks: string[] = [];

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const href = await link.getAttribute('href');
        const linkText = await link.textContent();
        
        const identifier = linkText || `link-${i}`;

        if (!href || href === '#' || href === 'javascript:void(0)') {
          // Verificar se tem onClick
          const hasOnClick = await link.evaluate((el) => {
            if (el.onclick) return true;
            const listeners = (window as any).getEventListeners?.(el);
            return listeners && listeners.click && listeners.click.length > 0;
          });

          if (!hasOnClick) {
            deadLinks.push(identifier);
            console.log(`   ❌ Link sem destino: "${identifier}" (href: ${href})`);
          }
        }
      }

      // Gerar relatório
      if (deadButtons.length > 0 || deadLinks.length > 0) {
        const report = `
          ⚠️ PROBLEMAS ENCONTRADOS EM ${route.name}:
          - Botões sem handler: ${deadButtons.length}
          - Links sem destino: ${deadLinks.length}
          
          Detalhes:
          ${deadButtons.map(b => `  • Botão: ${b}`).join('\n')}
          ${deadLinks.map(l => `  • Link: ${l}`).join('\n')}
        `;
        console.log(report);
      } else {
        console.log(`   ✅ Todos os elementos interativos estão funcionais!`);
      }

      // Falhar o teste se houver problemas
      expect(deadButtons.length, `Botões sem handler em ${route.name}`).toBe(0);
      expect(deadLinks.length, `Links sem destino em ${route.name}`).toBe(0);
    });
  }

  test('Auditoria de formulários', async ({ page }) => {
    // Testar páginas com formulários
    const formsPages = ['/crm', '/employees', '/settings/api'];

    for (const path of formsPages) {
      await page.goto(`http://localhost:3000${path}`);
      await page.waitForLoadState('networkidle');

      const forms = await page.locator('form').all();
      
      if (forms.length === 0) continue;

      console.log(`\n📋 Formulários em ${path}: ${forms.length}`);

      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        
        // Verificar se tem onSubmit
        const hasSubmit = await form.evaluate((el) => {
          if (el.onsubmit) return true;
          const listeners = (window as any).getEventListeners?.(el);
          return listeners && listeners.submit && listeners.submit.length > 0;
        });

        if (!hasSubmit) {
          console.log(`   ❌ Formulário ${i + 1} sem handler de submit`);
        } else {
          console.log(`   ✅ Formulário ${i + 1} possui handler de submit`);
        }

        expect(hasSubmit, `Formulário ${i + 1} em ${path} deve ter handler de submit`).toBe(true);
      }
    }
  });
});

test.describe('Auditoria de Navegação', () => {
  test('Todas as rotas do TopBar são acessíveis', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    for (const route of routes) {
      // Clicar no ícone de navegação
      await page.click(`button[title="${route.name}"]`);
      
      // Aguardar navegação
      await page.waitForURL(`**${route.path}`);
      
      // Verificar se a página carregou
      await expect(page).not.toHaveTitle('Error');
      
      console.log(`✅ Navegação para ${route.name} funcionou`);
    }
  });
});
