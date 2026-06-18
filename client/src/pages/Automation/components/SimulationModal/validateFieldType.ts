function validateFieldType(field: ConfigField, value: string): ValidationError | null {
  // URL validation
  if (field.key.toLowerCase().includes('url' ) || field.key.toLowerCase().includes('endpoint' )) {
    // Skip validation for relative URLs (internal API routes)
    if (value.startsWith('/api/')) return null;
    if (value.startsWith('http://' ) || value.startsWith('https://' )) {
      try {
        new URL(value);
      } catch {
        return {
          field: field.label,
          message: `URL inválida: "${value}"`,
          suggestion: 'Insira uma URL válida completa, ex: https://api.exemplo.com/webhook',
        };
      }
    } else if (value && !value.startsWith('/')) {
      return {
        field: field.label,
        message: `URL inválida: "${value}"`,
        suggestion: 'Use URL relativa começando com /api/ ou URL completa',
      };
    }
  }

  // JSON validation
  if (field.type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return {
        field: field.label,
        message: `JSON inválido no campo "${field.label}"`,
        suggestion: 'Verifique a sintaxe JSON. Use um validador online como jsonlint.com para corrigir.',
      };
    }
  }

  // CRON validation
  if (field.key.toLowerCase().includes('cron') || field.key.toLowerCase().includes('expression')) {
    const parts = value.trim().split(/\s+/);
    if (parts.length < 5) {
      return {
        field: field.label,
        message: `Expressão CRON inválida: "${value}"`,
        suggestion: 'Use o formato: minuto hora dia mês dia-da-semana. Ex: "0 8 * * 1" (segunda às 8h). Use crontab.guru para gerar.',
      };
    }
  }

  // Phone number validation
  if (field.key.toLowerCase().includes('phone') || field.key.toLowerCase().includes('to')) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 13) {
      return {
        field: field.label,
        message: `Número de telefone inválido: "${value}"`,
        suggestion: 'Insira o número com código do país e DDD. Ex: 5511999999999 (55=Brasil, 11=SP, 999999999=número).',
      };
    }
  }

  // Email validation
  if (field.key.toLowerCase().includes('email') || field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field: field.label,
        message: `Email inválido: "${value}"`,
        suggestion: 'Insira um email válido no formato: nome@exemplo.com',
      };
    }
  }

  // API Key validation
  if (field.key.toLowerCase().includes('apikey') || field.key.toLowerCase().includes('api_key')) {
    if (value.length < 10) {
      return {
        field: field.label,
        message: `API Key muito curta (${value.length} caracteres)`,
        suggestion: 'API Keys geralmente têm 20+ caracteres. Verifique se copiou a chave completa do painel do serviço.',
      };
    }
  }

  return null;
}