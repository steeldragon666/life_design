'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { FlowStateProvider } from '@/components/onboarding/flow-state';
import OnboardingWizard from '@/components/onboarding/onboarding-wizard';

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile } = useGuest();

  useEffect(() => {
    if (profile?.onboarded) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  if (profile?.onboarded) {
    return null;
  }

  return <>{children}</>;
}

export default function OnboardingPage() {
  return (
    <FlowStateProvider>
      <OnboardingGate>
        <OnboardingWizard />
      </OnboardingGate>
    </FlowStateProvider>
  );
}
