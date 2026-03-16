import { Check, Warning, X, Info } from '@phosphor-icons/react';
import { cn } from '../utils/cn';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info' | 'achievement';

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  description?: string;
  emoji?: string;
  onDismiss: () => void;
  className?: string;
}

const borderColor: Record<ToastVariant, string> = {
  success: 'border-l-sage-500',
  warning: 'border-l-warm-500',
  error: 'border-l-[#CC3333]',
  info: 'border-l-accent-600',
  achievement: 'border-l-sage-500',
};

const iconMap: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  success: Check,
  warning: Warning,
  error: X,
  info: Info,
};

export function Toast({ variant, message, description, emoji, onDismiss, className }: ToastProps) {
  const Icon = iconMap[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm p-4 bg-white rounded-[12px] border-l-[3px]',
        'shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]',
        'animate-[slideIn_300ms_ease-out]',
        borderColor[variant],
        variant === 'achievement' && 'bg-gradient-to-r from-sage-50 to-sage-100',
        className,
      )}
      role="alert"
    >
      {variant === 'achievement' && emoji ? (
        <span className="text-xl">{emoji}</span>
      ) : Icon ? (
        <Icon size={18} className="mt-0.5 shrink-0 text-stone-600" />
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800">{message}</p>
        {description && <p className="text-[13px] text-stone-600 mt-0.5">{description}</p>}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
