import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CorrelationsClient from './correlations-client';

export const metadata = {
  title: 'Correlation Explorer — Opt In',
  description: 'Discover statistically validated patterns across your 8 life dimensions.',
};

/**
 * Server component entry point for the Correlation Explorer.
 * Validates authentication and delegates rendering to the client component.
 */
export default async function CorrelationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <CorrelationsClient />;
}
