'use client';

import { cn } from '../utils/cn';

export interface BottomNavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  /** Link component override — pass Next.js Link or React Router NavLink. Defaults to `'a'`. */
  linkComponent?: React.ElementType;
  className?: string;
}

export function BottomNav({ items, linkComponent: LinkComponent = 'a', className }: BottomNavProps) {
  return (
    <nav className={cn('fixed bottom-0 left-0 right-0 z-30 bg-surface-default/95 backdrop-blur-sm border-t border-stone-200 sm:hidden', className)}>
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => (
          <LinkComponent
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[64px] transition-colors',
              item.active
                ? 'text-sage-600'
                : 'text-stone-400 hover:text-stone-600',
            )}
          >
            <div className="w-6 h-6">{item.icon}</div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </LinkComponent>
        ))}
      </div>
    </nav>
  );
}
