import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { integrationSettings } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { fetchWhatsAppProfile } from './integrations/whatsapp-business';
import { fetchInstagramProfile, fetchInstagramProfilePublic } from './integrations/instagram-graph';

/**
 * Router para busca automática de informações de contato
 * Busca nome e informações de perfil do Instagram e WhatsApp
 */

export const contactFetchRouter = router({
  /**
   * Buscar nome do contato do WhatsApp
   * Usa a API do WhatsApp Business para buscar informações do perfil
   */
  fetchWhatsAppName: protectedProcedure
    .input(
      z.object({
        phone: z.string().min(10, 'Telefone inválido'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Buscar configuração ativa do WhatsApp Business
        const [config] = await db
          .select()
          .from(integrationSettings)
          .where(
            and(
              eq(integrationSettings.integrationType, 'whatsapp_business'),
              eq(integrationSettings.isActive, true)
            )
          )
          .limit(1);

        if (!config) {
          // Fallback: retornar nome genérico se não houver configuração
          return {
            success: true,
            name: `Contato ${input.phone.slice(-4)}`,
            phone: input.phone,
            source: 'whatsapp',
            profilePicture: null,
            usingFallback: true,
          };
        }

        // Buscar perfil usando API real
        const profile = await fetchWhatsAppProfile(input.phone, config.config as any);

        return {
          success: true,
          name: profile.name,
          phone: profile.phone,
          source: 'whatsapp',
          profilePicture: profile.profilePicture || null,
          usingFallback: false,
        };
      } catch (error) {
        console.error('[WhatsApp Fetch] Error:', error);
        
        // Fallback em caso de erro
        return {
          success: true,
          name: `Contato ${input.phone.slice(-4)}`,
          phone: input.phone,
          source: 'whatsapp',
          profilePicture: null,
          usingFallback: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Buscar nome do contato do Instagram
   * Usa a API do Instagram Graph para buscar informações do perfil
   */
  fetchInstagramName: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1, 'Username inválido'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Buscar configuração ativa do Instagram Graph API
        const [config] = await db
          .select()
          .from(integrationSettings)
          .where(
            and(
              eq(integrationSettings.integrationType, 'instagram_graph'),
              eq(integrationSettings.isActive, true)
            )
          )
          .limit(1);

        let profile;
        let usingFallback = false;

        if (!config) {
          // Tentar método público (fallback)
          console.log('[Instagram] No API config found, using public method');
          profile = await fetchInstagramProfilePublic(input.username);
          usingFallback = true;
        } else {
          // Usar API oficial
          try {
            profile = await fetchInstagramProfile(input.username, config.config as any);
          } catch (error) {
            // Se API oficial falhar, tentar método público
            console.log('[Instagram] API failed, falling back to public method');
            profile = await fetchInstagramProfilePublic(input.username);
            usingFallback = true;
          }
        }

        return {
          success: true,
          name: profile.name || `@${input.username}`,
          username: profile.username || input.username,
          bio: profile.biography || null,
          source: 'instagram',
          profilePicture: profile.profilePicture || null,
          followersCount: profile.followersCount || null,
          usingFallback,
        };
      } catch (error) {
        console.error('[Instagram Fetch] Error:', error);
        
        // Fallback final
        return {
          success: true,
          name: `@${input.username}`,
          username: input.username,
          bio: null,
          source: 'instagram',
          profilePicture: null,
          usingFallback: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Buscar informações de contato de forma automática
   * Tenta buscar do WhatsApp ou Instagram baseado no tipo de canal
   */
  fetchContactInfo: protectedProcedure
    .input(
      z.object({
        identifier: z.string().min(1, 'Identificador inválido'),
        channel: z.enum(['whatsapp', 'instagram', 'telegram', 'email']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        let contactInfo: {
          name: string;
          source: string;
          profilePicture?: string | null;
          bio?: string | null;
        };

        switch (input.channel) {
          case 'whatsapp':
            // Buscar do WhatsApp - implementação inline
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockWhatsAppNames: Record<string, string> = {
              '5511999999999': 'João Silva',
              '5511988888888': 'Maria Santos',
              '5511977777777': 'Pedro Oliveira',
            };
            contactInfo = {
              name: mockWhatsAppNames[input.identifier] || `Contato ${input.identifier.slice(-4)}`,
              source: 'whatsapp',
              profilePicture: null,
            };
            break;

          case 'instagram':
            // Buscar do Instagram - implementação inline
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockInstagramProfiles: Record<string, { name: string; bio?: string }> = {
              'joaosilva': { name: 'João Silva', bio: 'Empresário | São Paulo' },
              'mariasantos': { name: 'Maria Santos', bio: 'Designer | Rio de Janeiro' },
              'pedrooliveira': { name: 'Pedro Oliveira', bio: 'Desenvolvedor | Belo Horizonte' },
            };
            const profile = mockInstagramProfiles[input.identifier.toLowerCase()] || {
              name: `@${input.identifier}`,
              bio: null,
            };
            contactInfo = {
              name: profile.name,
              source: 'instagram',
              profilePicture: null,
              bio: profile.bio || null,
            };
            break;

          case 'telegram':
            // TODO: Implementar busca do Telegram
            contactInfo = {
              name: `Telegram ${input.identifier}`,
              source: 'telegram',
            };
            break;

          case 'email':
            // Extrair nome do email
            const emailName = input.identifier.split('@')[0];
            contactInfo = {
              name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
              source: 'email',
            };
            break;

          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Canal não suportado',
            });
        }

        return {
          success: true,
          ...contactInfo,
          identifier: input.identifier,
          channel: input.channel,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar informações de contato',
        });
      }
    }),
});
