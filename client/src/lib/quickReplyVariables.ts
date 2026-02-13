function getSaudacao(now: Date) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export function applyQuickReplyVariables(
  template: string,
  params: {
    agentName?: string | null;
    now?: Date;
  } = {}
) {
  const now = params.now ?? new Date();
  const saudacao = getSaudacao(now);
  const nome = (params.agentName || "").trim() || "atendente";

  return String(template || "")
    .replace(/!saudacao!/gi, saudacao)
    .replace(/!nome!/gi, nome);
}
