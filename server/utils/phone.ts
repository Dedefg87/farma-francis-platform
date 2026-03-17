/**
 * Utilitários para normalização de números de telefone WhatsApp
 */

/**
 * Normaliza número do WhatsApp para formato único (com 9º dígito para Brasil)
 *
 * Regra: Para números brasileiros (DDI 55), garantimos o 9º dígito após o DDD.
 * Entrada: "+55 31 8633-7081", "553186337081", "3196337081", "5531986337081"
 * Saída: "5531986337081" (sempre com o 9)
 *
 * @param rawNumber - Número cru recebido (pode conter @s.whatsapp.net, espaços, etc.)
 * @returns Número normalizado apenas dígitos, com 9º dígito garantido para Brasil
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  if (!rawNumber) return '';

  // 1. Remove qualquer caractere que não seja número (incluindo @s.whatsapp.net)
  let cleaned = rawNumber.replace(/\D/g, '');

  // 2. Se tiver @ (formato WhatsApp ID), extrair apenas a parte numérica antes do @
  if (rawNumber.includes('@')) {
    const atIndex = rawNumber.indexOf('@');
    const beforeAt = rawNumber.substring(0, atIndex).replace(/\D/g, '');
    if (beforeAt.length >= 10 && beforeAt.length <= 15) {
      cleaned = beforeAt;
    }
  }

  // 3. Regra específica para o Brasil (DDI 55)
  if (cleaned.startsWith('55')) {
    // Se o número tem 12 dígitos (55 + DDD + 8 números), adiciona o 9
    if (cleaned.length === 12) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      cleaned = `55${ddd}9${number}`;
    }
    // Se tem 13 dígitos, já está correto (com o 9)
    // Se tem 11 dígitos (sem DDI 55), não faz nada (números internacionais)
  }

  return cleaned;
}

/**
 * Normaliza número mantendo o formato internacional (+55...)
 * Usado para exibição ou quando precisamos do + no início
 */
export function normalizeWhatsAppNumberWithPlus(rawNumber: string): string {
  const normalized = normalizeWhatsAppNumber(rawNumber);
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

/**
 * Gera variantes de busca para encontrar um número no banco
 * Agora compatível com formatPhoneBR (armazenamento sem o 9)
 * Gera tanto a versão com 9 quanto sem 9 para garantir compatibilidade
 */
export function getPhoneSearchVariants(rawNumber: string): string[] {
  const variants: string[] = [];

  // Obter o número no formato de armazenamento (sem o 9)
  const normalized = formatPhoneBR(rawNumber);
  variants.push(normalized);

  // Se for brasileiro e正常 (12 dígitos após normalize), gerar também a variante com o 9
  // Isso permite que buscas encontrem números antigos que possam ter sido salvos com 9
  if (normalized.startsWith('55') && normalized.length === 12) {
    // Adiciona o 9 após o DDD (posição 4)
    const with9 = normalized.slice(0, 4) + '9' + normalized.slice(4);
    variants.push(with9);
    // Também com + prefix
    variants.push(`+${normalized}`);
    variants.push(`+${with9}`);
  }

  // Deduplica
  return [...new Set(variants)];
}

/**
 * Retorna as duas variações principais de um número brasileiro:
 * - Variação original (com ou sem 9)
 * - Variação oposta (se tiver 9,remove; se não tiver, adiciona)
 *
 * Usado para queries exatas (IN) no banco
 */
export function getBrazilianPhoneVariations(phone: string): string[] {
  if (!phone.startsWith('55')) return [phone];

  const withoutCountry = phone.slice(2);

  if (withoutCountry.length === 10) {
    // Sem o 9: 55 + DDD (2) + numero (8) = 12 dígitos
    const ddd = withoutCountry.slice(0, 2);
    const number = withoutCountry.slice(2);
    return [phone, `55${ddd}9${number}`];
  } else if (withoutCountry.length === 11) {
    // Com o 9: 55 + DDD (2) + 9 + numero (8) = 13 dígitos
    const ddd = withoutCountry.slice(0, 2);
    const number = withoutCountry.slice(3);
    return [phone, `55${ddd}${number}`];
  }

  return [phone];
}

/**
 * Retorna todas as variações de busca (normalizadas) para um número.
 * Compatível com formatPhoneBR (armazenamento sem 9).
 * Inclui: número formatado (sem 9), com 9, com +, etc.
 */
export function getAllPhoneSearchVariants(rawPhone: string): string[] {
  return getPhoneSearchVariants(rawPhone);
}

/**
 * 🚨 FUNÇÃO CRÍTICA DE NORMALIZAÇÃO DE TELEFONE
 * Garante que todos os números do banco tenham o MESMO FORMATO
 * Padrão único: 55 + DDD + 8 dígitos (celular sem o 9)
 *
 * Regras estritas:
 * 1. Remover TUDO que não é dígito (+, -, (, ), espaços, @s.whatsapp.net)
 * 2. Se não começar com 55, prefixar com 55 (assume Brasil)
 * 3. Se for celular BR (55 + DDD + 9 dígitos), REMOVER o 9º dígito
 * 4. Retornar apenas dígitos (sem +)
 *
 * Entradas comuns:
 *   "+55 31 99999-9999" → "553199999999"
 *   "31999999999" → "553199999999"
 *   "55 31 999999999" → "553199999999"
 *   "999999999" → "55999999999" (erra, mas prefixa 55)
 *
 * Esta é a única função que deve ser usada antes de db.select/insert na tabela customers
 */
export function formatPhoneBR(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';

  // 1. Extrair apenas números
  let digits = rawPhone.replace(/\D/g, '');

  // 2. Se contém @ (ex: 12345@s.whatsapp.net), pegar apenas a parte numérica antes do @
  if (rawPhone.includes('@')) {
    const atIndex = rawPhone.indexOf('@');
    const beforeAt = rawPhone.substring(0, atIndex).replace(/\D/g, '');
    if (beforeAt.length >= 10) {
      digits = beforeAt;
    }
  }

  // 3. Se não tem 55 no início, adicionar
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // 4. Remover o 9º dígito se for celular brasileiro
  // Formato esperado: 55 + DDD(2) + 9 + número(8) = 13 dígitos
  if (digits.length === 13 && digits.startsWith('55')) {
    // Remove o 9 na posição 4 (após DDD)
    digits = digits.slice(0, 4) + digits.slice(5);
  }

  // 5. Garantir que não tem mais de 13 ou menos de 12 dígitos (BR válido)
  // Se tiver 14 (com +55), remove o +
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  return digits;
}
