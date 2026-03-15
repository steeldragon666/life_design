'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';

// ---------------------------------------------------------------------------
// Inline SVG icons (matching redesign stroke style)
// ---------------------------------------------------------------------------

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 17 3.5s4 2 4 9-5.5 8-5.5 8" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/goals', label: 'Goals', icon: TargetIcon },
  { href: '/checkin', label: 'Check-in', icon: SunIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
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

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAFAF8]">
        <div className="max-w-md w-full text-center space-y-3 p-8 rounded-2xl bg-white border border-[#E8E4DD]/60">
          <p className="text-sm text-[#A8A198]">Preparing your space...</p>
          <div className="h-1.5 w-full bg-[#F5F3EF] rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-[#9BB89B] to-[#5A7F5A] animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-[#E8E4DD] bg-white/60 backdrop-blur-xl fixed h-full z-30">
        <div className="p-6 pb-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#739A73] flex items-center justify-center shadow-sm">
              <LeafIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Design</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 pt-6 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive(item.href)
                  ? 'bg-[#F4F7F4] text-[#5A7F5A] shadow-sm'
                  : 'text-[#7D756A] hover:bg-[#F5F3EF] hover:text-[#3D3833]'
                }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${isActive(item.href) ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-[#F4F7F4] to-[#E4ECE4] border border-[#C4D5C4]/30">
          <p className="text-xs text-[#5A7F5A] font-medium">Daily Intention</p>
          <p className="text-[13px] text-[#3D3833] mt-1 font-['Instrument_Serif'] italic text-lg leading-snug">&ldquo;Be present in every moment&rdquo;</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] pb-24 lg:pb-8">
        <div className="animate-fade-up">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-2xl border-t border-[#E8E4DD] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all
                ${isActive(item.href) ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive(item.href) && (
                <div className="w-1 h-1 rounded-full bg-[#5A7F5A] mt-0.5" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
