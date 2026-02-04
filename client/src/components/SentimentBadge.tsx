/**
 * Componente de badge de sentimento
 * Exibe ícone visual baseado no sentimento detectado
 */

import { Smile, Meh, Frown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SentimentBadgeProps {
  sentiment: 'happy' | 'neutral' | 'frustrated';
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function SentimentBadge({ sentiment, confidence, size = 'md' }: SentimentBadgeProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const config = {
    happy: {
      icon: Smile,
      color: 'text-green-600',
      label: 'Cliente Satisfeito',
      emoji: '😊',
    },
    neutral: {
      icon: Meh,
      color: 'text-gray-600',
      label: 'Cliente Neutro',
      emoji: '😐',
    },
    frustrated: {
      icon: Frown,
      color: 'text-red-600',
      label: 'Cliente Frustrado',
      emoji: '😠',
    },
  };

  const { icon: Icon, color, label, emoji } = config[sentiment];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            <Icon className={`${sizeClasses[size]} ${color}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {emoji} {label}
            {confidence && (
              <span className="text-xs text-muted-foreground ml-1">
                ({Math.round(confidence * 100)}%)
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
