'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { Leaf, User } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load the floating Aria chat so it doesn't block initial render
const FloatingAria = dynamic(() => import('@/components/aria/floating-aria'), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Tab config — Variant C "Story" navigation
// ---------------------------------------------------------------------------

type TabItem = {
  href: string;
  label: string;
};

const tabs: TabItem[] = [
  { href: '/dashboard', label: 'Today' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/goals', label: 'Goals' },
  { href: '/checkin', label: 'Check-in' },
  { href: '/journal', label: 'Journal' },
  { href: '/insights', label: 'Insights' },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isHydrated } = useGuest();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-warm-50 to-stone-50">
        <div className="max-w-md w-full text-center space-y-3 p-8 rounded-2xl bg-white border border-stone-200/60">
          <p className="text-sm text-stone-500">Preparing your space...</p>
          <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-sage-300 to-sage-500 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 via-stone-50 to-stone-50">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-stone-200/60">
        <div className="max-w-3xl mx-auto px-4">
          {/* Logo row */}
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-sm">
                <Leaf size={16} className="text-white" />
              </div>
              <span className="font-serif text-lg text-stone-800">Opt In</span>
            </Link>

            <Link
              href="/settings"
              className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition"
            >
              <User size={18} className="text-stone-600" />
            </Link>
          </div>

          {/* Horizontal scrollable tab pills */}
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive(tab.href)
                    ? 'bg-sage-100 text-sage-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main id="main" className="max-w-3xl mx-auto pb-24">
        <div className="animate-fade-up">{children}</div>
      </main>

      {/* ── Floating Aria Chat ──────────────────────────────────────────── */}
      <FloatingAria />
    </div>
  );
}
