// Tipos compartilhados para Conversas e Mensagens

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PENDING = 'pending',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
}

export enum ConversationChannel {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
  WEBCHAT = 'webchat',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export interface Conversation {
  id: string;
  externalId: string;
  channel: ConversationChannel;
  channelReference: string;
  customerId: string;
  assignedAgentId: string | null;
  status: ConversationStatus;
  subject: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  messageId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact';
  senderType: 'customer' | 'agent' | 'system';
  senderId: string | null;
  senderName: string | null;
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  thumbnailUrl: string | null;
}
