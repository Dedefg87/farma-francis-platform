/**
 * Profile Picture Service v2
 *
 * Downloads WhatsApp profile pictures using authenticated Evolution API proxy.
 * The Evolution API instance has an authenticated WhatsApp session with cookies,
 * so it can fetch images from the CDN. We NEVER fetch directly from WhatsApp CDN
 * because we don't have the session cookies.
 */

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
 * Get Evolution API config from DB
 */
async function getEvolutionConfig(): Promise<{
  apiUrl: string;
  apiKey: ***
  instanceName: string;
} | null> {
  try {
    const { integrationSettings } = await import('../../drizzle/schema');
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, 'evolution_api'))
      .limit(1);

    if (!row) return null;
    const cfg =
      typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    const apiUrl = cfg.apiUrl?.replace(/\/$/, '');
    const apiKey = cfg.apiKey || cfg.accessToken || cfg.token;
    const instanceName = cfg.instanceName || cfg.instance || 'Meu';
    if (!apiUrl || !apiKey || !instanceName) return null;
    return { apiUrl, apiKey, instanceName };
  } catch {
    return null;
  }
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
 * Download bytes from a WhatsApp CDN URL through Evolution API proxy.
 * Evolution API has the authenticated session cookies needed to fetch from CDN.
 * We request that Evolution returns the bytes directly (not just a URL).
 */
async function downloadViaEvolutionProxy(url: string): Promise<Buffer | null> {
  const config = await getEvolutionConfig();
  if (!config) return null;

  console.log(
    '[ProfilePic] Downloading via Evolution proxy:',
    url.substring(0, 80)
  );

  // Método 1: POST /instance/{instance} com { url }
  // Este endpoint pode retornar bytes diretamente ou uma URL interna
  try {
    const res = await fetch(
      `${config.apiUrl}/instance/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      
      // Se retornou bytes diretamente (imagem/jpeg, etc)
      if (!contentType.includes('application/json')) {
        const arr = await res.arrayBuffer();
        const buf = Buffer.from(arr);
        if (buf.length > 100) {
          console.log('[ProfilePic] ✅ Proxy returned bytes:', buf.length);
          return buf;
        }
      }
      
      // Se retornou JSON com URL interna, precisamos pedir para Evolution baixar essa URL também
      if (contentType.includes('application/json')) {
        const data = await res.json();
        
        // Se tem base64 inline
        if (data?.base64) {
          console.log('[ProfilePic] ✅ Got base64 from proxy');
          return Buffer.from(data.base64, 'base64');
        }
        
        // Se tem URL interna, tentar baixar via outro endpoint do Evolution
        const innerUrl = data?.url || data?.mediaUrl;
        if (innerUrl && innerUrl.startsWith('http')) {
          console.log('[ProfilePic] Trying to download inner URL via Evolution...');
          return await downloadInnerUrlViaEvolution(innerUrl);
        }
      }
    } else {
      console.log('[ProfilePic] Proxy endpoint failed:', res.status);
    }
  } catch (err) {
    console.log('[ProfilePic] Proxy method failed:', err);
  }

  // Método 2: /chat/fetchProfilePicture - endpoint específico para foto de perfil
  try {
    const res2 = await fetch(
      `${config.apiUrl}/chat/fetchProfilePicture/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: url }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (res2.ok) {
      const ct2 = res2.headers.get('content-type') || '';
      
      // Se retornou bytes
      if (!ct2.includes('application/json')) {
        const arr = await res2.arrayBuffer();
        const buf = Buffer.from(arr);
        if (buf.length > 100) {
          console.log('[ProfilePic] ✅ fetchProfilePicture returned bytes:', buf.length);
          return buf;
        }
      }
      
      if (ct2.includes('application/json')) {
        const data2 = await res2.json();
        if (data2?.base64) {
          console.log('[ProfilePic] ✅ Got base64 from fetchProfilePicture');
          return Buffer.from(data2.base64, 'base64');
        }
        
        const innerUrl2 = data2?.url || data2?.mediaUrl;
        if (innerUrl2 && innerUrl2.startsWith('http')) {
          return await downloadInnerUrlViaEvolution(innerUrl2);
        }
      }
    }
  } catch (err) {
    console.log('[ProfilePic] fetchProfilePicture endpoint failed:', err);
  }

  return null;
}

/**
 * Download an inner URL (could be another WhatsApp CDN URL or Evolution-internal URL)
 * by asking Evolution to fetch it. We try the message/download endpoint which may
 * have access to fetch internal URLs.
 */
async function downloadInnerUrlViaEvolution(
  innerUrl: string
): Promise<Buffer | null> {
  const config = await getEvolutionConfig();
  if (!config) return null;

  // Tentar /message/download endpoint (usado para baixar mídia de mensagens)
  try {
    const res = await fetch(
      `${config.apiUrl}/message/download/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: innerUrl }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        const arr = await res.arrayBuffer();
        const buf = Buffer.from(arr);
        if (buf.length > 100) {
          console.log('[ProfilePic] ✅ /message/download returned bytes:', buf.length);
          return buf;
        }
      }
      
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.base64) {
          return Buffer.from(data.base64, 'base64');
        }
      }
    }
  } catch (err) {
    console.log('[ProfilePic] /message/download failed:', err);
  }

  return null;
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
    if (!r2Url) return null;

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
