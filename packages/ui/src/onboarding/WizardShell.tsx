'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { ProgressBar } from '../components/ProgressBar';

export interface WizardShellProps {
  children: React.ReactNode;
  progress: number;
  onBack?: () => void;
  canGoBack?: boolean;
  sectionLabel?: string;
  className?: string;
}

export function WizardShell({
  children,
  progress,
  onBack,
  canGoBack = false,
  sectionLabel,
  className,
}: WizardShellProps) {
  return (
    <div className={cn('min-h-screen flex flex-col bg-surface-page', className)}>
      <header className="sticky top-0 z-10 bg-surface-page/95 backdrop-blur-sm border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft size={20} className="text-stone-600" />
            </button>
          )}
          <div className="flex-1">
            {sectionLabel && (
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                {sectionLabel}
              </p>
            )}
            <ProgressBar value={progress} size="sm" variant="sage" />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
