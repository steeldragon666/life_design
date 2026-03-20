import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open) return null;
  return (
    <>
      <div data-testid="modal-overlay" className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className={cn('bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] max-w-lg w-full p-8', className)} onClick={e => e.stopPropagation()}>
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {children}
          {footer && <div className="flex justify-end gap-3 mt-6">{footer}</div>}
        </div>
      </div>
    </>
  );
}
