/**
 * Integração com Instagram Graph API
 * 
 * Documentação: https://developers.facebook.com/docs/instagram-api
 */

interface InstagramConfig {
  accessToken: string;
  instagramBusinessAccountId: string;
}

interface InstagramProfile {
  username: string;
  name: string;
  biography?: string;
  profilePicture?: string;
  followersCount?: number;
  followsCount?: number;
}

/**
 * Buscar informações de perfil do Instagram
 * @param username Username do Instagram (sem @)
 * @param config Configurações da API do Instagram
 */
export async function fetchInstagramProfile(
  username: string,
  config: InstagramConfig
): Promise<InstagramProfile> {
  try {
    // Remover @ se presente
    const cleanUsername = username.replace('@', '');
    
    // Primeiro, buscar o ID do usuário pelo username
    const searchUrl = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${config.instagramBusinessAccountId}&q=${cleanUsername}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Instagram API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    // Buscar informações detalhadas do perfil
    // Nota: A Instagram Graph API tem limitações para buscar perfis de terceiros
    // Esta implementação assume que você tem permissões adequadas
    const userId = searchData.data?.[0]?.id;
    
    if (!userId) {
      throw new Error('User not found');
    }

    const profileUrl = `https://graph.facebook.com/v18.0/${userId}?fields=username,name,biography,profile_picture_url,followers_count,follows_count`;
    
    const profileResponse = await fetch(profileUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Instagram API error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();

    return {
      username: profileData.username || cleanUsername,
      name: profileData.name || cleanUsername,
      biography: profileData.biography,
      profilePicture: profileData.profile_picture_url,
      followersCount: profileData.followers_count,
      followsCount: profileData.follows_count,
    };
  } catch (error) {
    console.error('[Instagram API] Error fetching profile:', error);
    
    // Fallback: retornar informações básicas se API falhar
    const cleanUsername = username.replace('@', '');
    return {
      username: cleanUsername,
      name: cleanUsername,
    };
  }
}

/**
 * Verificar se as credenciais do Instagram Graph API são válidas
 */
export async function validateInstagramCredentials(
  config: InstagramConfig
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v18.0/${config.instagramBusinessAccountId}?fields=id,username`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[Instagram API] Error validating credentials:', error);
    return false;
  }
}

/**
 * Buscar foto de perfil do Instagram
 * @param username Username do Instagram
 * @param config Configurações da API
 */
export async function fetchInstagramProfilePicture(
  username: string,
  config: InstagramConfig
): Promise<string | null> {
  try {
    const profile = await fetchInstagramProfile(username, config);
    return profile.profilePicture || null;
  } catch (error) {
    console.error('[Instagram API] Error fetching profile picture:', error);
    return null;
  }
}

/**
 * Método alternativo usando scraping público (fallback)
 * Nota: Este método não requer autenticação mas pode ser menos confiável
 */
export async function fetchInstagramProfilePublic(
  username: string
): Promise<Partial<InstagramProfile>> {
  try {
    const cleanUsername = username.replace('@', '');
    
    // Usar endpoint público do Instagram (pode mudar sem aviso)
    const url = `https://www.instagram.com/${cleanUsername}/?__a=1&__d=dis`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch public profile');
    }

    const data = await response.json();
    const user = data?.graphql?.user;

    if (!user) {
      throw new Error('User data not found');
    }

    return {
      username: user.username,
      name: user.full_name || user.username,
      biography: user.biography,
      profilePicture: user.profile_pic_url_hd || user.profile_pic_url,
      followersCount: user.edge_followed_by?.count,
      followsCount: user.edge_follow?.count,
    };
  } catch (error) {
    console.error('[Instagram Public] Error fetching profile:', error);
    
    const cleanUsername = username.replace('@', '');
    return {
      username: cleanUsername,
      name: cleanUsername,
    };
  }
}
