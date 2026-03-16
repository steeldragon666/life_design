'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { Toast, type ToastVariant } from '@life-design/ui';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  description?: string;
  emoji?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string, opts?: { description?: string; emoji?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((variant: ToastVariant, message: string, opts?: { description?: string; emoji?: string; duration?: number }) => {
    const id = nextId++;
    const item: ToastItem = { id, variant, message, ...opts };
    setToasts(prev => [...prev.slice(-2), item]); // max 3 visible
    const duration = variant === 'achievement' ? 8000 : (opts?.duration ?? 5000);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast variant={t.variant} message={t.message} description={t.description} emoji={t.emoji} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
