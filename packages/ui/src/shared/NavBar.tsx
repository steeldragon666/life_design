'use client';

import { cn } from '../utils/cn';

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavBarProps {
  logo?: React.ReactNode;
  links?: NavLink[];
  userAvatar?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function NavBar({ logo, links, userAvatar, actions, className }: NavBarProps) {
  return (
    <nav className={cn('flex items-center justify-between px-4 sm:px-6 py-3 bg-surface-default/95 backdrop-blur-sm border-b border-stone-200', className)}>
      <div className="flex items-center gap-6">
        {logo && <div className="shrink-0">{logo}</div>}
        {links && (
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  link.active
                    ? 'text-sage-600 bg-sage-50'
                    : 'text-stone-600 hover:text-stone-800 hover:bg-stone-50',
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {userAvatar}
      </div>
    </nav>
  );
}
