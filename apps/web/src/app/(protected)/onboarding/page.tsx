import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { listMentors } from '@/lib/services/mentor-service';
import OnboardingClient from './onboarding-client';
import { completeOnboarding, onboardActivateMentor, onboardSaveProfile } from './actions';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single();

  if (profile?.onboarded) {
    redirect('/dashboard');
  }

  const { data: mentors } = await listMentors();

  return (
    <OnboardingClient
      mentors={mentors ?? []}
      onComplete={completeOnboarding}
      onActivateMentor={onboardActivateMentor}
      onSaveProfile={onboardSaveProfile}
    />
  );
}
