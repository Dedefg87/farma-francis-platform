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
 * (com/sem 9, com/sem +55, etc.)
 * Usado em consultas WHERE com LIKE
 */
export function getPhoneSearchVariants(rawNumber: string): string[] {
  const normalized = normalizeWhatsAppNumber(rawNumber);
  const variants: string[] = [];

  // Sempre inclui a forma normalizada
  variants.push(normalized);

  // Se for brasileiro, gera variantes sem o 9º dígito
  if (normalized.startsWith('55') && normalized.length === 13) {
    // Remove o 9º dígito (posição 4)
    const without9 = normalized.slice(0, 4) + normalized.slice(5);
    variants.push(without9);
  }

  // Também inclui com + prefix
  if (!normalized.startsWith('+')) {
    variants.push(`+${normalized}`);
    if (normalized.startsWith('55') && normalized.length === 13) {
      variants.push(`+${without9}`);
    }
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
 * Inclui: número normalizado (com 9), sem o 9, com +, etc.
 * Usado para busca flexível com WHERE like ou inArray.
 */
export function getAllPhoneSearchVariants(rawPhone: string): string[] {
  const normalized = normalizeWhatsAppNumber(rawPhone);
  const variants: string[] = [];

  // Forma normalizada (com 9)
  variants.push(normalized);

  // Se brasileiro, adiciona variação sem o 9
  if (normalized.startsWith('55') && normalized.length === 13) {
    const without9 = normalized.slice(0, 4) + normalized.slice(5);
    variants.push(without9);
    // Também com + prefix
    variants.push(`+${normalized}`);
    variants.push(`+${without9}`);
  }

  // Deduplica
  return [...new Set(variants)];
}
