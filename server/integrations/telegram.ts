/**
 * Integração com Telegram Bot API
 * 
 * Documentação: https://core.telegram.org/bots/api
 */

interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
}

interface TelegramProfile {
  id: number;
  name: string;
  username?: string;
  profilePicture?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: TelegramChat;
    date: number;
    text?: string;
    photo?: Array<{ file_id: string; file_size: number; width: number; height: number }>;
    document?: { file_id: string; file_name?: string; mime_type?: string };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    message?: any;
    data?: string;
  };
}

/**
 * Fazer requisição para a API do Telegram
 */
async function telegramApi(
  botToken: string,
  method: string,
  params: Record<string, any> = {}
): Promise<any> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result;
}

/**
 * Buscar informações de um usuário do Telegram
 * @param userId ID do usuário ou username (sem @)
 * @param config Configurações do bot
 */
export async function fetchTelegramProfile(
  userId: string | number,
  config: TelegramConfig
): Promise<TelegramProfile | null> {
  try {
    // Se for username (string), precisamos de um chat_id para buscar
    // A API do Telegram não permite buscar por username diretamente
    // Então retornamos info básica
    
    if (typeof userId === 'string' && !/^\d+$/.test(userId)) {
      // É um username
      return {
        id: 0,
        name: `@${userId.replace('@', '')}`,
        username: userId.replace('@', ''),
      };
    }

    // Se for um ID numérico, podemos buscar info do chat
    const chatId = typeof userId === 'string' ? parseInt(userId) : userId;
    
    const chat = await telegramApi(config.botToken, 'getChat', {
      chat_id: chatId,
    });

    const profile: TelegramProfile = {
      id: chat.id,
      name: chat.first_name || chat.title || `User ${chatId}`,
      username: chat.username,
    };

    // Tentar buscar foto de perfil
    try {
      const photos = await telegramApi(config.botToken, 'getUserProfilePhotos', {
        user_id: chatId,
        limit: 1,
      });

      if (photos.photos && photos.photos.length > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await telegramApi(config.botToken, 'getFile', {
          file_id: fileId,
        });
        profile.profilePicture = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
      }
    } catch {
      // Foto de perfil é opcional
    }

    return profile;
  } catch (error) {
    console.error('[Telegram API] Error fetching profile:', error);
    return null;
  }
}

/**
 * Validar credenciais do bot
 */
export async function validateTelegramCredentials(
  config: TelegramConfig
): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
  try {
    const me = await telegramApi(config.botToken, 'getMe', {});
    
    return {
      valid: true,
      botInfo: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries,
      },
    };
  } catch (error) {
    console.error('[Telegram API] Error validating credentials:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enviar mensagem de texto
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  config: TelegramConfig,
  options: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disable_notification?: boolean;
    reply_to_message_id?: number;
  } = {}
): Promise<any> {
  return telegramApi(config.botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode,
    disable_notification: options.disable_notification,
    reply_to_message_id: options.reply_to_message_id,
  });
}

/**
 * Configurar webhook para receber updates
 */
export async function setTelegramWebhook(
  webhookUrl: string,
  config: TelegramConfig,
  options: {
    secret_token?: string;
    max_connections?: number;
  } = {}
): Promise<boolean> {
  try {
    await telegramApi(config.botToken, 'setWebhook', {
      url: webhookUrl,
      secret_token: options.secret_token,
      max_connections: options.max_connections || 40,
      allowed_updates: ['message', 'callback_query', 'edited_message'],
    });
    
    return true;
  } catch (error) {
    console.error('[Telegram API] Error setting webhook:', error);
    return false;
  }
}

/**
 * Remover webhook
 */
export async function deleteTelegramWebhook(
  config: TelegramConfig
): Promise<boolean> {
  try {
    await telegramApi(config.botToken, 'deleteWebhook', {});
    return true;
  } catch (error) {
    console.error('[Telegram API] Error deleting webhook:', error);
    return false;
  }
}

/**
 * Obter informações do webhook
 */
export async function getTelegramWebhookInfo(
  config: TelegramConfig
): Promise<any> {
  return telegramApi(config.botToken, 'getWebhookInfo', {});
}

/**
 * Processar update recebido via webhook
 */
export function parseTelegramUpdate(update: TelegramUpdate): {
  type: 'message' | 'callback' | 'edited';
  from?: {
    id: number;
    name: string;
    username?: string;
  };
  chat?: {
    id: number;
    type: string;
    name?: string;
  };
  content?: {
    text?: string;
    mediaType?: 'photo' | 'document';
    fileId?: string;
  };
  timestamp: number;
} | null {
  if (update.message) {
    const msg = update.message;
    return {
      type: 'message',
      from: msg.from ? {
        id: msg.from.id,
        name: `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`,
        username: msg.from.username,
      } : undefined,
      chat: {
        id: msg.chat.id,
        type: msg.chat.type,
        name: msg.chat.title || msg.chat.first_name || msg.chat.username,
      },
      content: {
        text: msg.text,
        mediaType: msg.photo ? 'photo' : msg.document ? 'document' : undefined,
        fileId: msg.photo?.[0]?.file_id || msg.document?.file_id,
      },
      timestamp: msg.date * 1000,
    };
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    return {
      type: 'callback',
      from: {
        id: cb.from.id,
        name: cb.from.first_name,
        username: cb.from.username,
      },
      content: {
        text: cb.data,
      },
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Enviar arquivo/foto
 */
export async function sendTelegramDocument(
  chatId: number | string,
  fileUrl: string,
  config: TelegramConfig,
  options: {
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<any> {
  return telegramApi(config.botToken, 'sendDocument', {
    chat_id: chatId,
    document: fileUrl,
    caption: options.caption,
    parse_mode: options.parse_mode,
  });
}

/**
 * Enviar foto
 */
export async function sendTelegramPhoto(
  chatId: number | string,
  photoUrl: string,
  config: TelegramConfig,
  options: {
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<any> {
  return telegramApi(config.botToken, 'sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: options.caption,
    parse_mode: options.parse_mode,
  });
}

export type { TelegramConfig, TelegramProfile, TelegramUpdate, TelegramChat };
