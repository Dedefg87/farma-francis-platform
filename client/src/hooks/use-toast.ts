/**
 * Hook para exibir notificações toast
 * Implementação simplificada usando alert temporariamente
 * TODO: Integrar com biblioteca de toast (sonner, react-hot-toast)
 */

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant } = options;
    const message = description ? `${title}\n${description}` : title;
    
    if (variant === 'destructive') {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  };

  return { toast };
}
