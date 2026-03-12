import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(auth)/actions';
import { 
  LayoutDashboard, 
  Target, 
  Lightbulb, 
  Users, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect un-onboarded users to onboarding (skip if already there)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  if (!pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single();

    if (profile && !profile.onboarded) {
      redirect('/onboarding');
    }
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Insights', href: '/insights', icon: Lightbulb },
    { name: 'Mentors', href: '/mentors', icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0c]">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Life Design</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Link>
          <form action={signOut}>
            <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-red-500/10 text-slate-400 hover:text-red-400">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary-500/5 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-6xl mx-auto pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
