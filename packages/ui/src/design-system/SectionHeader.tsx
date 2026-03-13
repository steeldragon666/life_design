'use client';

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  level?: 'h2' | 'h3';
  className?: string;
}

/**
 * Section header with Cabinet Grotesk heading and optional Erode subtitle.
 * Optional right-aligned action button.
 */
export default function SectionHeader({
  title,
  subtitle,
  action,
  level = 'h2',
  className = '',
}: SectionHeaderProps) {
  const headingSize = level === 'h2' ? 'text-2xl' : 'text-xl';

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <div
          className={`${headingSize} font-bold text-white tracking-tight`}
          style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
        >
          {title}
        </div>
        {subtitle && (
          <p
            className="text-sm text-slate-400 mt-1"
            style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
