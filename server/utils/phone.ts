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
  
  // Remove leading 0 if present (common in some formats)
  if (digits.length > 13 && digits.startsWith('0')) digits = digits.slice(1);
  
  if (digits.length > 13) return '';
  if (!digits.startsWith('55')) digits = '55' + digits;
  
  // If it's 12 digits (55 + DDD + 8 digits), add the 9
  if (digits.length === 12) {
    digits = digits.slice(0, 4) + '9' + digits.slice(4);
  }
  
  if (digits.length !== 13) return '';
  return digits;
}

export function generatePhoneVariants(phone: string): string[] {
  if (!phone) return [];
  let digits = extractDigits(phone);
  if (digits.length > 14) return [];
  if (!digits.startsWith('55')) digits = '55' + digits;
  // Normalize to 13 digits
  if (digits.length === 12) digits = digits.slice(0, 4) + '9' + digits.slice(4);
  if (digits.length === 14) digits = digits.slice(0, 13);
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

/**
 * Extrai últimos 8 dígitos de um telefone (chave de busca universal)
 * Ex: 5531986337081 → 986337081
 *     553186337081 → 86337081 (mesmos últimos 8)
 *     +5531986337081 → 986337081
 */
export function phoneLast8(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = extractDigits(raw);
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

/**
 * Busca ID de conversa existente por telefone (usando últimos 8 dígitos)
 * Resolve o problema de clientes duplicados com formatos diferentes de telefone
 * 
 * Fluxo:
 * 1. Busca clientes por últimos 8 dígitos do telefone
 * 2. Para cada cliente encontrado, busca conversa (open/assigned/closed)
 * 3. Retorna a conversa mais recente
 * 
 * Se não encontrar nenhuma, retorna null
 */
export async function findConversationByPhone(
  db: unknown,
  phone: string,
  conversationsTable: unknown,
  customersTable: unknown
): Promise<{ conversationId: number; customerId: number; status: string } | null> {
  const { eq, desc, inArray, like, or } = await import('drizzle-orm');
  
  const last8 = phoneLast8(phone);
  if (last8.length < 8) return null;

  // Buscar TODOS os clientes que compartilham os mesmos últimos 8 dígitos
  const matchedCustomers = await db
    .select({ id: customersTable.id, phone: customersTable.phone })
    .from(customersTable)
    .where(like(customersTable.phone, `%${last8}%`))
    .limit(10);

  if (matchedCustomers.length === 0) return null;

  const customerIds = matchedCustomers.map((c: unknown) => c.id);

  // Buscar conversa mais recente de QUALQUER um desses clientes
  const [conversation] = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      status: conversationsTable.status,
    })
    .from(conversationsTable)
    .where(inArray(conversationsTable.customerId, customerIds))
    .orderBy(desc(conversationsTable.lastMessageAt))
    .limit(1);

  return conversation ? { conversationId: conversation.id, customerId: conversation.customerId, status: conversation.status } : null;
}
