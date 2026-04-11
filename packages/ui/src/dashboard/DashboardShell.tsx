'use client';

import { cn } from '../utils/cn';

export interface DashboardShellProps {
  nav?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ nav, sidebar, children, className }: DashboardShellProps) {
  return (
    <div className={cn('min-h-screen flex flex-col bg-surface-page', className)}>
      {nav && <div className="sticky top-0 z-20">{nav}</div>}
      <div className="flex-1 flex">
        {sidebar && (
          <aside className="hidden lg:block w-64 border-r border-stone-200 p-4 shrink-0">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
