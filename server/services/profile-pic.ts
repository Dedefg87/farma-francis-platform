/**
 * Profile Picture Service v2
 *
 * Downloads WhatsApp profile pictures.
 * Strategy:
 *   1) Direct fetch from WhatsApp CDN with WhatsApp-compatible User-Agent —
 *      WhatsApp profile pics are public for any WhatsApp client UA.
 *      2) Fallback: if direct download fails (privacy-restricted profile or CDN
 *      block), use Evolution API authenticated proxy.
 * The resulting bytes are uploaded to R2 and the permanent URL is persisted
 * in customers.photoUrl. We NEVER point the UI at a raw WhatsApp CDN URL
 * because those expire and are hotlink-protected for generic clients.
 */

import { getEvolutionConfig } from './evolution-download';
import { getDb } from '../db';
import { customers, receivedMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { uploadToR2 } from '../r2-client';

// In-memory lock to prevent concurrent downloads for the same customer
const downloadLocks = new Map<string, Promise<string | null>>();

export function getCustomerInitials(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 4) return cleanPhone.slice(-4);
  return 'USR';
}

/**
 * Fetch profile pic URL or base64 from Evolution API /chat/fetchProfile
 */
async function fetchProfileFromEvolution(phone: string): Promise<{
  pictureUrl?: string;
  pictureBase64?: string;
  name?: string;
  pushName?: string;
} | null> {
  const config = await getEvolutionConfig();
  if (!config) return null;

  const number = phone.replace(/\D/g, '');
  if (!number) return null;

  console.log('[ProfilePic] fetchProfile for', number, '→', config.apiUrl);

  try {
    // Endpoint principal: /chat/fetchProfile/{instance}
    const res = await fetch(
      `${config.apiUrl}/chat/fetchProfile/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) {
      console.log('[ProfilePic] fetchProfile failed:', res.status);
      return null;
    }

    const data = await res.json();
    console.log('[ProfilePic] fetchProfile response keys:', Object.keys(data));

    // Evolution pode retornar em vários formatos
    const picture =
      data.profilePicture || data.picture || data.profilePictureUrl || null;

    if (!picture) return null;

    const result: {
      pictureUrl?: string;
      pictureBase64?: string;
      name?: string;
      pushName?: string;
    } = {};

    if (picture.startsWith('data:')) {
      result.pictureBase64 = picture;
    } else if (picture.startsWith('http')) {
      result.pictureUrl = picture;
    }

    if (data.name) result.name = data.name;
    if (data.pushName) result.pushName = data.pushName;

    return result;
  } catch (err) {
    console.error('[ProfilePic] fetchProfile error:', err);
    return null;
  }
}
/**
 * Download bytes from a WhatsApp CDN URL via Evolution API proxy.
 *
 * CRITICAL FIX: WhatsApp CDN URLs (pps.whatsapp.net) require authentication.
 * Direct fetch NEVER works. Must use Evolution's authenticated proxy endpoint.
 *
 * Solution: Use Evolution's /chat/getBase64FromMediaMessage endpoint which
 * has access to the authenticated session and can fetch CDN resources.
 */
async function downloadViaEvolutionProxy(url: string): Promise<Buffer | null> {
  const config = await getEvolutionConfig();
  if (!config) {
    console.error('[ProfilePic] ❌ No Evolution config available');
    return null;
  }

  console.log(
    '[ProfilePic] Downloading WhatsApp CDN URL via Evolution proxy:',
    url.substring(0, 80)
  );

  // ============================================================
  // Use Evolution's getBase64FromMediaMessage endpoint
  // This endpoint has authenticated access to WhatsApp CDN
  // ============================================================
  try {
    // Extrair o número do telefone da URL se possível
    // Formato típico: https://pps.whatsapp.net/v/t61.24694-24/123456_789012_345678901234567_1234567890123456789_n.jpg?...
    // Não podemos extrair o número da URL, então precisamos fazer uma abordagem diferente

    // Estratégia: Fazer fetch proxy via Evolution
    // Evolution tem endpoint para baixar mídia através de sua sessão autenticada
    const proxyUrl = `${config.apiUrl}/chat/getBase64FromMediaMessage/${config.instanceName}`;

    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
          },
          message: {
            imageMessage: {
              url: url,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.log('[ProfilePic] ❌ Proxy request failed:', res.status);
      return null;
    }

    const data = await res.json();

    // Se retornou base64 inline
    const pic = data?.base64 || data?.picture || data?.profilePicture || null;
    if (pic && pic.startsWith('data:')) {
      const match = pic.match(/^data:([^;]+);base64,(.*)$/s);
      if (match && match[2]) {
        const buf = Buffer.from(match[2], 'base64');
        if (buf.length > 100) {
          console.log('[ProfilePic] ✅ Got base64 from Evolution proxy:', buf.length, 'bytes');
          return buf;
        }
      }
    } else if (pic && !pic.startsWith('data:')) {
      // Base64 puro sem data: prefix
      const buf = Buffer.from(pic, 'base64');
      if (buf.length > 100) {
        console.log('[ProfilePic] ✅ Got base64 from Evolution proxy (raw):', buf.length, 'bytes');
        return buf;
      }
    }

    console.log('[ProfilePic] ❌ No valid base64 in response');
    return null;
  } catch (err) {
    console.error('[ProfilePic] ❌ Evolution proxy error:', err);
    return null;
  }
}

/**
 * Upload buffer to R2 under profile-pics/ path
 */
async function uploadProfilePicToR2(
  buffer: Buffer,
  customerId: number,
  mimetype: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const fileName = `profile-pics/${customerId}-${Date.now()}.jpg`;
    const result = await uploadToR2(buffer, fileName, mimetype);
    if (result?.url) {
      console.log(
        '[ProfilePic] ✅ R2 upload OK:',
        result.url.substring(0, 80)
      );
      return result.url;
    }
    return null;
  } catch (err) {
    console.error('[ProfilePic] R2 upload failed:', err);
    return null;
  }
}

/**
 * Main function: resolve, download and upload profile pic for a customer.
 * Returns the permanent R2 URL, or null if no picture available.
 * Uses in-memory lock to prevent concurrent downloads for same phone.
 */
export async function downloadAndUploadProfilePic(
  phone: string,
  customerId: number
): Promise<string | null> {
  const lockKey = `${phone}:${customerId}`;

  // Se já há um download em andamento para esse customer, reutilizar
  const existing = downloadLocks.get(lockKey);
  if (existing) {
    console.log('[ProfilePic] Download already in progress for', lockKey);
    return existing;
  }

  const promise = _downloadAndUploadProfilePic(phone, customerId).finally(
    () => {
      downloadLocks.delete(lockKey);
    }
  );

  downloadLocks.set(lockKey, promise);
  return promise;
}

async function _downloadAndUploadProfilePic(
  phone: string,
  customerId: number
): Promise<string | null> {
  try {
    console.log(
      '[ProfilePic] Resolving profile pic for customer',
      customerId,
      'phone:',
      phone
    );

    // 1. Buscar perfil via Evolution API
    const profile = await fetchProfileFromEvolution(phone);
    if (!profile) {
      console.log('[ProfilePic] No profile data from Evolution for', phone);
      return null;
    }

    // Atualizar nome do cliente se disponível
    if (profile.name || profile.pushName) {
      try {
        const db = await getDb();
        if (db) {
          await db
            .update(customers)
            .set({
              name: profile.name || profile.pushName,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customerId));
        }
      } catch {}
    }

    let buffer: Buffer | null = null;
    let mimetype = 'image/jpeg';

    // 2a. Base64 inline do Evolution
    if (profile.pictureBase64) {
      const match = profile.pictureBase64.match(/^data:([^;]+);base64,(.*)$/s);
      if (match && match[1] && match[2]) {
        mimetype = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        // base64 puro sem data: prefix
        buffer = Buffer.from(profile.pictureBase64, 'base64');
      }
      console.log(
        '[ProfilePic] Got base64 from Evolution:',
        buffer.length,
        'bytes'
      );
    }

    // 2b. URL remota (WhatsApp CDN) — baixar SEMPRE via Evolution proxy (nunca direto)
    // O Evolution tem a sessão autenticada com cookies do WhatsApp Web
    if (!buffer && profile.pictureUrl) {
      console.log(
        '[ProfilePic] Downloading WhatsApp CDN URL via Evolution proxy...'
      );
      buffer = await downloadViaEvolutionProxy(profile.pictureUrl);
    }

    if (!buffer || buffer.length < 100) {
      console.log(
        '[ProfilePic] ❌ Could not resolve profile pic bytes for',
        phone
      );
      return null;
    }

    console.log(
      '[ProfilePic] Downloaded',
      buffer.length,
      'bytes for customer',
      customerId
    );

    // 3. Upload para R2
    const r2Url = await uploadProfilePicToR2(buffer, customerId, mimetype);
    if (!r2Url) {
  // R2 falhou: fallback para data URL inline (nao depende de credenciais R2).
  // customers.photoUrl e varchar(500) — pequeno demais para base64, entao
  // gravamos apenas em receivedMessages.fromProfilePic (longtext), que o
  // COALESCE do Inbox ja usa para exibir o avatar.
  const dataUrl = `data:${mimetype || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  const dbF = await getDb();
  if (dbF) {
    await dbF
      .update(receivedMessages)
      .set({ fromProfilePic: dataUrl })
      .where(eq(receivedMessages.customerId, customerId));
  }
  console.log(
    '[ProfilePic] R2 falhou — fallback data URL inline para customer',
    customerId,
    '(' + buffer.length + ' bytes)'
  );
  return dataUrl;
}

    // 4. Persistir no DB
    const db = await getDb();
    if (db) {
      await db
        .update(customers)
        .set({ photoUrl: r2Url, updatedAt: new Date() })
        .where(eq(customers.id, customerId));

      // Atualizar também fromProfilePic nas received_messages deste cliente
      await db
        .update(receivedMessages)
        .set({ fromProfilePic: r2Url })
        .where(eq(receivedMessages.customerId, customerId));

      console.log(
        '[ProfilePic] ✅ DB updated for customer',
        customerId,
        '→',
        r2Url.substring(0, 60)
      );
    }

    return r2Url;
  } catch (err) {
    console.error('[ProfilePic] Error for customer', customerId, ':', err);
    return null;
  }
}
