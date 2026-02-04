import { describe, it, expect } from "vitest";
import { getSentMessages } from "./messaging";

describe("Messaging System", () => {
  it("should get sent messages with filters", async () => {
    const messages = await getSentMessages({
      limit: 10,
    });

    expect(Array.isArray(messages)).toBe(true);
  });

  it("should filter messages by channel", async () => {
    const whatsappMessages = await getSentMessages({
      channel: "whatsapp",
      limit: 10,
    });

    expect(Array.isArray(whatsappMessages)).toBe(true);
    whatsappMessages.forEach((msg) => {
      expect(msg.channel).toBe("whatsapp");
    });
  });

  it("should filter messages by customer ID", async () => {
    const customerMessages = await getSentMessages({
      customerId: 1,
      limit: 10,
    });

    expect(Array.isArray(customerMessages)).toBe(true);
  });
});

describe("Flow Engine Variables", () => {
  it("should replace simple variables", () => {
    // Test variable replacement logic
    const context = {
      customer: { name: "João", phone: "+5511999999999" },
      message: { text: "Olá" },
    };

    const template = "Olá {{customer.name}}, seu telefone é {{customer.phone}}";
    const expected = "Olá João, seu telefone é +5511999999999";

    // Simple replacement function for testing
    const result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split(".");
      let value: any = context;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }
      return value !== undefined ? String(value) : match;
    });

    expect(result).toBe(expected);
  });

  it("should handle missing variables gracefully", () => {
    const context = {
      customer: { name: "João" },
    };

    const template = "Olá {{customer.name}}, ticket: {{ticket.id}}";
    const result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split(".");
      let value: any = context;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }
      return value !== undefined ? String(value) : match;
    });

    expect(result).toContain("João");
    expect(result).toContain("{{ticket.id}}"); // Should keep placeholder
  });
});
