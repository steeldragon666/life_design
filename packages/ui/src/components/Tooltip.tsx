'use client';
import { useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface TooltipProps { content: ReactNode; children: ReactNode; className?: string; }
export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span role="tooltip" className={cn('absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-[8px] bg-stone-800 text-white text-[11px] font-medium whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50', className)}>
          {content}
        </span>
      )}
    </span>
  );
}

export interface PopoverProps { content: ReactNode; children: ReactNode; className?: string; }
export function Popover({ content, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <span onClick={() => setOpen(!open)}>{children}</span>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn('absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4 rounded-[12px] bg-white border border-stone-200 shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50', className)}>
            {content}
          </div>
        </>
      )}
    </span>
  );
}
