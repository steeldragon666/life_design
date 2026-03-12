'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { ThemeSelectorCompact } from '@/components/theme/theme-selector';
import { 
  LayoutDashboard, 
  Target, 
  Lightbulb, 
  Users, 
  Sparkles,
  ChevronRight,
  UserCircle,
  CheckCircle2,
  Compass,
  Palette,
  Waves
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useGuest();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentHour = new Date().getHours();
  const ritualWindow = currentHour < 12 ? 'Morning' : 'Evening';
  const primaryNavItems = [
    { name: 'Today', mobileName: 'Today', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rituals', mobileName: 'Rituals', href: '/checkin', icon: Compass },
    { name: 'Meditations', mobileName: 'Meditations', href: '/meditations', icon: Waves },
    { name: 'Future Self', mobileName: 'Future', href: '/future-self', icon: Sparkles },
    { name: 'Mentor', mobileName: 'Mentor', href: '/mentors', icon: Users },
    { name: 'Goals', mobileName: 'Goals', href: '/goals', icon: Target },
  ];
  const secondaryNavItems = [
    { name: 'Insights', href: '/insights', icon: Lightbulb },
    { name: 'Settings', href: '/settings', icon: Palette },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen bg-[#0a0e17]">
      {/* Desktop Sidebar - iOS Style Glass */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 z-50 glass border-r border-white/5">
        {/* Logo Section */}
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gradient-blue tracking-tight">Life Design</span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">COMPANION SPACE</p>
            </div>
          </Link>
        </div>

        {/* User Profile Preview */}
        {profile?.name && (
          <div className="px-4 mb-4">
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                <p className="text-xs text-slate-500 truncate">{profile.profession || 'Life Designer'}</p>
              </div>
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation - iOS Style */}
        <nav className="flex-1 px-4 space-y-1">
          <p className="section-subheader px-2">Your Flow</p>
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.href)
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`h-5 w-5 transition-transform ${
                isActive(item.href) ? 'text-blue-400' : 'group-hover:scale-110'
              }`} />
              <span className="font-medium text-sm">{item.name}</span>
              {isActive(item.href) && (
                <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
              )}
            </Link>
          ))}
          <div className="pt-5 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600 px-2">More</p>
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive(item.href)
                    ? 'bg-white/8 text-slate-100'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 space-y-3 border-t border-white/5">
          {/* Theme Quick Switch */}
          <div className="px-4 py-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Theme</p>
            <ThemeSelectorCompact />
          </div>

          {/* Daily Check-in CTA */}
          <Link
            href="/checkin"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-500/20 hover:border-teal-500/40 transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <Compass className="h-4 w-4 text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{ritualWindow} Ritual</p>
              <p className="text-xs text-slate-500">Quick start your current ritual</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Navigation - iOS Tab Bar Style */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 tab-bar">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`tab-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="h-6 w-6" strokeWidth={isActive(item.href) ? 2.5 : 2} />
              <span>{item.mobileName}</span>
            </Link>
          ))}
          <Link href="/settings" className={`tab-item ${isActive('/settings') ? 'active' : ''}`}>
            <UserCircle className="h-6 w-6" strokeWidth={isActive('/settings') ? 2.5 : 2} />
            <span>Profile</span>
          </Link>
        </nav>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pb-24' : 'lg:ml-72'} relative overflow-hidden`}>
        {/* Background Ambient Effects */}
        <div className="fixed top-0 right-0 h-[600px] w-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 left-1/4 h-[400px] w-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Content Container */}
        <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
