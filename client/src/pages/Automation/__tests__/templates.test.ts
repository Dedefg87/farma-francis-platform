import { describe, it, expect } from "vitest";
import { flowTemplates } from "../templates";

describe("flowTemplates", () => {
  it("deve ter 6 templates", () => {
    expect(flowTemplates).toHaveLength(6);
  });

  it("cada template deve ter propriedades obrigatórias", () => {
    flowTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.icon).toBeDefined();
      expect(template.color).toBeDefined();
      expect(template.nodes).toBeDefined();
      expect(template.edges).toBeDefined();
    });
  });

  it("cada template deve ter pelo menos 1 nó", () => {
    flowTemplates.forEach(template => {
      expect(template.nodes.length).toBeGreaterThan(0);
    });
  });

  it("template de boas-vindas deve ter gatilho de novo contato", () => {
    const welcomeTemplate = flowTemplates.find(t => t.id === "welcome");

    expect(welcomeTemplate).toBeDefined();
    expect(welcomeTemplate?.nodes[0].data.config?.event).toBe("new_contact");
  });

  it("template de FAQ deve ter nó de IA", () => {
    const faqTemplate = flowTemplates.find(t => t.id === "faq");

    expect(faqTemplate).toBeDefined();
    expect(faqTemplate?.nodes.some(n => n.data.label === "Consultar IA")).toBe(true);
  });

  it("template de qualificação deve ter perguntas", () => {
    const qualTemplate = flowTemplates.find(t => t.id === "qualification");

    expect(qualTemplate).toBeDefined();
    expect(qualTemplate?.nodes.some(n => n.data.label?.includes("Pergunta"))).toBe(true);
  });

  it("template de agendamento deve ter verificação de disponibilidade", () => {
    const schedTemplate = flowTemplates.find(t => t.id === "scheduling");

    expect(schedTemplate).toBeDefined();
    expect(schedTemplate?.nodes.some(n => n.data.label === "Verificar Disponibilidade")).toBe(true);
  });

  it("template de satisfação deve ter pesquisa de avaliação", () => {
    const satTemplate = flowTemplates.find(t => t.id === "satisfaction");

    expect(satTemplate).toBeDefined();
    expect(satTemplate?.nodes.some(n => n.data.label === "Solicitar Avaliação")).toBe(true);
  });

  it("template de chatbot deve ter verificação de horário", () => {
    const chatbotTemplate = flowTemplates.find(t => t.id === "chatbot-atendimento");

    expect(chatbotTemplate).toBeDefined();
    expect(chatbotTemplate?.nodes.some(n => n.data.label?.includes("Horário"))).toBe(true);
  });

  it("todas as conexões devem apontar para nós existentes", () => {
    flowTemplates.forEach(template => {
      const nodeIds = new Set(template.nodes.map(n => n.id));

      template.edges.forEach(edge => {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      });
    });
  });

  it("todos os templates devem ter cor válida", () => {
    flowTemplates.forEach(template => {
      expect(template.color).toMatch(/^bg-/);
    });
  });
});
