/**
 * Utilitarios para normalizacao de numeros de telefone WhatsApp
 * PADRAO UNICO: 55 + DDD + 9 + 8 digitos = 13 digitos (COM o 9)
 */

function extractDigits(raw: string): string {
  if (!raw) return '';
  if (raw.includes('@')) {
    const beforeAt = raw.substring(0, raw.indexOf('@')).replace(/\D/g, '');
    if (beforeAt.length >= 8) return beforeAt;
  }
  return raw.replace(/\D/g, '');
}

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = extractDigits(raw);
  if (digits.length > 13) return '';
  if (!digits.startsWith('55')) digits = '55' + digits;
  if (digits.length === 12) digits = digits.slice(0, 4) + '9' + digits.slice(4);
  if (digits.length !== 13) return '';
  return digits;
}

export function generatePhoneVariants(phone: string): string[] {
  if (!phone) return [];
  let digits = extractDigits(phone);
  if (digits.length > 13) return [];
  if (!digits.startsWith('55')) digits = '55' + digits;
  const variants = new Set<string>();
  if (digits.length === 13) {
    const sem9 = digits.slice(0, 4) + digits.slice(5);
    variants.add(digits);
    variants.add(sem9);
    variants.add('+' + digits);
    variants.add('+' + sem9);
  } else if (digits.length === 12) {
    const com9 = digits.slice(0, 4) + '9' + digits.slice(4);
    variants.add(digits);
    variants.add(com9);
    variants.add('+' + digits);
    variants.add('+' + com9);
  }
  return [...variants];
}

export function formatPhoneBR(raw: string | null | undefined): string {
  return normalizePhone(raw);
}

export function normalizeWhatsAppNumber(raw: string): string {
  return normalizePhone(raw);
}

export function normalizeWhatsAppNumberWithPlus(raw: string): string {
  const n = normalizePhone(raw);
  return n ? '+' + n : '';
}
