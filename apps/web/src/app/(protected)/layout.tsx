import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(auth)/actions';

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

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg">
            Life Design
          </Link>
          <Link href="/dashboard" className="text-sm hover:underline">
            Dashboard
          </Link>
          <Link href="/checkin" className="text-sm hover:underline">
            Check-in
          </Link>
          <Link href="/mentors" className="text-sm hover:underline">
            Mentors
          </Link>
          <Link href="/insights" className="text-sm hover:underline">
            Insights
          </Link>
          <Link href="/goals" className="text-sm hover:underline">
            Goals
          </Link>
          <Link href="/profile" className="text-sm hover:underline">
            Profile
          </Link>
          <Link href="/settings" className="text-sm hover:underline">
            Settings
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
