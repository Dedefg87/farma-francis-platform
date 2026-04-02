// Tipos compartilhados para Clientes

export interface Customer {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
  totalConversations: number;
  satisfactionScore: number | null;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  type: 'email' | 'phone' | 'whatsapp' | 'telegram' | 'sms' | 'other';
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
