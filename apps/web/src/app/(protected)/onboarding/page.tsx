'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { FlowStateProvider, useFlowState } from '@/components/onboarding/flow-state';
import StepDots, { StepDotsCompact } from '@/components/onboarding/step-dots';
import CinematicOpener from '@/components/onboarding/cinematic-opener';
import VoiceOnboardingAgent from '@/components/onboarding/voice-onboarding-agent';
import ResilientErrorBoundary, { GlassErrorFallbackCard } from '@/components/error/resilient-error-boundary';
import { Button } from '@life-design/ui';
import { cn } from '@/lib/utils';

const ErrorBoundary = ResilientErrorBoundary as any;

// Main content component that uses flow state
function OnboardingContent() {
  const router = useRouter();
  const { profile, setProfile, addGoal } = useGuest();
  const { currentStep, isTransitioning, goToStep } = useFlowState();

  // If already onboarded, redirect to dashboard
  useEffect(() => {
    if (profile?.onboarded) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  const handleComplete = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleExitOnboarding = useCallback(() => {
    // Route to login so onboarding can be resumed later without forcing completion.
    router.push('/login');
  }, [router]);

  const handleSaveProfile = async (data: any) => {
    setProfile({ ...data, onboarded: true });
    return { error: null };
  };

  const handleCreateGoals = async (goals: any[]) => {
    goals.forEach((goal) => {
      const targetDate = new Date();
      if (goal.horizon === 'short') {
        targetDate.setMonth(targetDate.getMonth() + 3);
      } else if (goal.horizon === 'medium') {
        targetDate.setMonth(targetDate.getMonth() + 12);
      } else {
        targetDate.setFullYear(targetDate.getFullYear() + 3);
      }

      addGoal({
        ...goal,
        status: 'active',
        target_date: targetDate.toISOString().split('T')[0],
      });
    });
    return { error: null };
  };

  const handleVideoComplete = useCallback(() => {
    goToStep('theme');
  }, [goToStep]);

  const handleVideoSkip = useCallback(() => {
    goToStep('theme');
  }, [goToStep]);

  // Video stage — cinematic opener
  if (currentStep === 'video') {
    return (
      <CinematicOpener
        onVideoComplete={handleVideoComplete}
        onVideoSkip={handleVideoSkip}
        onExitOnboarding={handleExitOnboarding}
        enableSkipAfter={3}
      />
    );
  }

  // All other stages — neutral white background with centered card layout
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-100 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sage-100 flex items-center justify-center">
                <span className="text-sage-600 text-sm font-bold">LD</span>
              </div>
              <span className="text-stone-800 font-semibold tracking-tight hidden sm:block">
                Life Design
              </span>
            </div>

            {/* Step indicators — desktop */}
            <div className="hidden md:block">
              <StepDots />
            </div>

            {/* Step indicators — mobile */}
            <div className="md:hidden">
              <StepDotsCompact />
            </div>

            {/* Exit option */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitOnboarding}
            >
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main
        className={cn(
          'flex-1 px-4 py-10 md:px-8 overflow-y-auto transition-opacity duration-500',
          isTransitioning ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div className="max-w-5xl mx-auto">
          <ErrorBoundary
            fallback={
              <GlassErrorFallbackCard
                title="Onboarding paused"
                description="Your guide ran into an issue. Refresh to continue your onboarding journey."
                className="min-h-[360px]"
              />
            }
            resetKeys={[currentStep]}
          >
            <VoiceOnboardingAgent
              onComplete={handleComplete}
              onSaveProfile={handleSaveProfile}
              onCreateGoals={handleCreateGoals}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Bottom safe area for mobile */}
      <div className="h-safe-bottom" />
    </div>
  );
}

// Wrapper with FlowStateProvider
export default function OnboardingPage() {
  return (
    <FlowStateProvider>
      <OnboardingContent />
    </FlowStateProvider>
  );
}
