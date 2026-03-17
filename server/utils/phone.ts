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
 * (Função removida — use generatePhoneVariants)
 */

/**
 * (Função removida — use generatePhoneVariants)
 */

/**
 * Gera as 6 variações possíveis de número de telefone brasileiro
 * para busca de contatos (evitar duplicação).
 *
 * A partir de um número recebido (qualquer formato), extrai o núcleo
 * DDD + número e gera todas as combinações de prefixos e com/sem 9.
 *
 * Variações geradas (ex: 31 8633-7081):
 *  1. +55 31 98633 7081  → "+55" + DDD + 9 + número
 *  2. +55 31 8633 7081   → "+55" + DDD + número (sem 9)
 *  3. 55 31 98633 7081   → "55" + DDD + 9 + número
 *  4. 55 31 8633 7081    → "55" + DDD + número (sem 9)
 *  5. 31 98633 7081      → DDD + 9 + número
 *  6. 31 8633 7081       → DDD + número (sem 9)
 *
 * Todas as variações são no formato de apenas dígitos (sem espaços, +, etc.)
 *
 * @param phone - Número em qualquer formato (com +, espaços, traços, etc.)
 * @returns Array com as 6 variações (deduplicadas)
 */
export function generatePhoneVariants(phone: string): string[] {
  if (!phone) return [];

  // 1. Extrair apenas dígitos
  let digits = phone.replace(/\D/g, '');

  // 2. Se contém @ (WhatsApp ID), usar apenas parte antes do @
  if (phone.includes('@')) {
    const atIndex = phone.indexOf('@');
    const beforeAt = phone.substring(0, atIndex).replace(/\D/g, '');
    if (beforeAt.length >= 10) {
      digits = beforeAt;
    }
  }

  // Se não tem dígitos suficientes, retorna o próprio
  if (digits.length < 10) return [digits];

  // 3. Identificar se tem DDI 55 no início
  let hasCountryCode = false;
  if (digits.startsWith('55')) {
    hasCountryCode = true;
    digits = digits.slice(2); // remove 55
  }

  // Agora digits deve ter DDD(2) + número (8 ou 9 dígitos)
  if (digits.length < 10) return [phone];

  const ddd = digits.slice(0, 2);
  const numberPart = digits.slice(2);

  // 4. Determinar se já tem o 9º dígito
  const has9 = numberPart.length === 9; // DDD + 9 + 8 dígitos = 11 dígitos sem DDI, ou 13 com DDI
  const base8 = numberPart.length === 8 || (has9 && numberPart.length === 9);

  let number8: string;
  let number9: string;

  if (has9) {
    // Tem 9 dígitos: DDD + 9 + 8
    number9 = numberPart;
    number8 = numberPart.slice(0, 1) + numberPart.slice(2); // remove o 9 (posição 1 do numberPart)
  } else {
    // Tem 8 dígitos (sem 9)
    number8 = numberPart;
    number9 = numberPart.length === 8 ? `9${numberPart}` : numberPart;
  }

  // 5. Montar as 6 variações (somente dígitos, sem +)
  const variants = new Set<string>();

  // Com +55 (mas sem o +, porque o campo phone armazena apenas dígitos)
  // Na busca, usamos apenas números, então adicionamos variações com 55
  variants.add(`55${ddd}${number9}`); // 55 + DDD + 9 + 8
  variants.add(`55${ddd}${number8}`); // 55 + DDD + 8

  // Sem 55 (apenas DDD + número)
  variants.add(`${ddd}${number9}`); // DDD + 9 + 8
  variants.add(`${ddd}${number8}`); // DDD + 8

  // Se o número original tinha +55, também podemos tentar com + (embora a busca no banco use apenas dígitos)
  // Mas para garantir, não incluímos o +, pois o campo phone não tem +

  // Se o número original tinha 55, já incluímos as com 55. Se não tinha, também incluímos (pois pode estar armazenado com 55)

  return [...variants];
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
