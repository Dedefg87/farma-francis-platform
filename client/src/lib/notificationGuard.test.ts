import { describe, it, expect } from "vitest";
import { shouldNotifyAgent } from "./notificationGuard";

describe("shouldNotifyAgent", () => {
  it("notifica quando a conversa e do usuario atual", () => {
    expect(shouldNotifyAgent(8, 8)).toBe(true);
  });
  it("nao notifica quando a conversa e de outro atendente", () => {
    expect(shouldNotifyAgent(8, 7)).toBe(false);
  });
  it("notifica conversa sem dono", () => {
    expect(shouldNotifyAgent(null, 8)).toBe(true);
    expect(shouldNotifyAgent(undefined, 8)).toBe(true);
    expect(shouldNotifyAgent("0", 8)).toBe(true);
  });
  it("nao notifica se o usuario atual nao esta resolvido", () => {
    expect(shouldNotifyAgent(8, null)).toBe(false);
  });
});
