'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useGuest } from '@/lib/guest-context';
import { House, Target, Sun, ChatCircle, Flask, Fire, Trophy, Gear, DotsThreeVertical, Leaf, CalendarBlank } from '@phosphor-icons/react';
import type { IconWeight } from '@phosphor-icons/react';

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: string | number; weight?: IconWeight }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/checkin', label: 'Check-in', icon: Sun },
  { href: '/mentor', label: 'Mentor', icon: ChatCircle },
  { href: '/schedule', label: 'Schedule', icon: CalendarBlank },
  { href: '/simulator', label: 'Simulate', icon: Flask },
  { href: '/challenges', label: 'Challenges', icon: Fire },
  { href: '/achievements', label: 'Badges', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Gear },
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const mobileMainItems = navItems.slice(0, 4); // Home, Goals, Check-in, Mentor
  const mobileMoreItems = navItems.slice(4); // Schedule, Simulate, Challenges, Badges, Settings
  const isMoreActive = mobileMoreItems.some(i => isActive(i.href));
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
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
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-stone-200 bg-white/60 backdrop-blur-xl fixed h-full z-30">
        <div className="p-6 pb-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-sm">
              <Leaf size={20} weight="regular" className="text-white" />
            </div>
            <span className="font-serif text-xl text-stone-800">Life Design</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 pt-6 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-sage-100 text-sage-600 shadow-sm'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`}
            >
              <item.icon size={20} weight="regular" className={isActive(item.href) ? 'text-sage-600' : 'text-stone-500'} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-sage-50 to-sage-100 border border-sage-200/30">
          <p className="text-xs text-sage-500 font-medium">Daily Intention</p>
          <p className="text-[13px] text-stone-700 mt-1 font-serif italic text-lg leading-snug">&ldquo;Be present in every moment&rdquo;</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] pb-24 lg:pb-8">
        <div className="animate-fade-up">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-2xl border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {mobileMainItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all
                ${isActive(item.href) ? 'text-sage-600' : 'text-stone-500'}`}
            >
              <item.icon size={20} weight="regular" />
              <span className="text-[11px] font-medium">{item.label}</span>
              {isActive(item.href) && (
                <div className="w-1 h-1 rounded-full bg-sage-500 mt-0.5" />
              )}
            </Link>
          ))}

          {/* "More" button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${moreOpen || isMoreActive ? 'text-sage-600' : 'text-stone-500'}`}
          >
            <DotsThreeVertical size={20} weight="regular" />
            <span className="text-[11px] font-medium">More</span>
            {isMoreActive && !moreOpen && (
              <div className="w-1 h-1 rounded-full bg-sage-500 mt-0.5" />
            )}
          </button>
        </div>
      </nav>

      {/* More drawer overlay */}
      {moreOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMoreOpen(false)} />
          <div className="lg:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom))] inset-x-0 z-35 bg-white rounded-t-2xl border-t border-stone-200 shadow-xl p-4 space-y-1">
            {mobileMoreItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive(item.href) ? 'bg-sage-100 text-sage-600' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                <item.icon size={20} weight="regular" />
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
