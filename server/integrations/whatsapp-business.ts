/**
 * Integração com WhatsApp Business API
 * 
 * Documentação: https://developers.facebook.com/docs/whatsapp/business-management-api
 */

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
}

interface WhatsAppProfile {
  name: string;
  phone: string;
  profilePicture?: string;
}

/**
 * Buscar informações de perfil do WhatsApp
 * @param phone Número de telefone no formato internacional (ex: 5511999999999)
 * @param config Configurações da API do WhatsApp Business
 */
export async function fetchWhatsAppProfile(
  phone: string,
  config: WhatsAppConfig
): Promise<WhatsAppProfile> {
  try {
    // Endpoint da WhatsApp Business API para buscar contato
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/contacts`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocking: 'wait',
        contacts: [phone],
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extrair informações do contato
    const contact = data.contacts?.[0];
    if (!contact) {
      throw new Error('Contact not found');
    }

    return {
      name: contact.profile?.name || `Contato ${phone.slice(-4)}`,
      phone,
      profilePicture: contact.profile?.picture || undefined,
    };
  } catch (error) {
    console.error('[WhatsApp API] Error fetching profile:', error);
    
    // Fallback: retornar nome genérico se API falhar
    return {
      name: `Contato ${phone.slice(-4)}`,
      phone,
    };
  }
}

/**
 * Verificar se as credenciais do WhatsApp Business API são válidas
 */
export async function validateWhatsAppCredentials(
  config: WhatsAppConfig
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp API] Error validating credentials:', error);
    return false;
  }
}

/**
 * Buscar foto de perfil do WhatsApp
 * @param phone Número de telefone
 * @param config Configurações da API
 */
export async function fetchWhatsAppProfilePicture(
  phone: string,
  config: WhatsAppConfig
): Promise<string | null> {
  try {
    // A API do WhatsApp Business retorna a foto de perfil junto com o contato
    const profile = await fetchWhatsAppProfile(phone, config);
    return profile.profilePicture || null;
  } catch (error) {
    console.error('[WhatsApp API] Error fetching profile picture:', error);
    return null;
  }
}
