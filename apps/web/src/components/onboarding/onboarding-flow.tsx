'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGuest } from '@/lib/guest-context';
import type { RawAnswers } from '@life-design/core';
import WelcomeCard from './cards/welcome-card';
import ExpectationsCard from './cards/expectations-card';
import DataImportCard from './cards/data-import-card';
import ProfilingWizard from './profiling-wizard';
import CheckInIntroCard from './cards/checkin-intro-card';
import StreaksCard from './cards/streaks-card';
import ConnectAppsCard from './cards/connect-apps-card';
import DashboardTourCard from './cards/dashboard-tour-card';
import AIMentorCard from './cards/ai-mentor-card';

const TOTAL_CARDS = 9;

export default function OnboardingFlow() {
  const router = useRouter();
  const { setProfile, profile } = useGuest();
  const [currentCard, setCurrentCard] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savedAnswers, setSavedAnswers] = useState<RawAnswers>({});
  const isAuthenticated = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Authenticated user: use server-side onboarding state
          isAuthenticated.current = true;

          const statusRes = await fetch('/api/onboarding/status');
          if (!statusRes.ok) {
            await fetch('/api/onboarding/start', { method: 'POST' }).catch(() => {});
            setLoading(false);
            return;
          }

          const data = await statusRes.json();

          if (data.status === 'completed') {
            router.push('/dashboard');
            return;
          }

          if (data.status === 'not_started') {
            await fetch('/api/onboarding/start', { method: 'POST' }).catch(() => {});
          }

          if (data.current_card) setCurrentCard(data.current_card);
          if (data.raw_answers) setSavedAnswers(data.raw_answers);
        } else {
          // Guest user: resume from localStorage
          const savedCard = localStorage.getItem('opt-in-onboarding-card');
          if (savedCard) {
            const parsed = parseInt(savedCard, 10);
            if (parsed >= 1 && parsed <= TOTAL_CARDS) {
              setCurrentCard(parsed);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Onboarding init error:', error);
        // Still show the flow even if there was an error — better than infinite loading
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const advanceCard = useCallback(async () => {
    const next = currentCard + 1;
    setCurrentCard(next);

    localStorage.setItem('opt-in-onboarding-card', String(next));
    if (isAuthenticated.current) {
      await fetch('/api/onboarding/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_card: next }),
      }).catch(() => {});
    }
  }, [currentCard]);

  const handleComplete = useCallback(async () => {
    if (isAuthenticated.current) {
      await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
    }
    // Mark guest profile as onboarded so middleware allows dashboard access
    setProfile({ id: profile?.id ?? 'guest-user', onboarded: true });
    // Set cookie synchronously — GuestProvider's useEffect won't fire before
    // router.push, so middleware would redirect back to /login without this.
    document.cookie = 'opt-in-guest-onboarded=1; Path=/; Max-Age=2592000; SameSite=Lax';
    localStorage.removeItem('opt-in-onboarding-card');
    router.push('/dashboard');
  }, [router, setProfile, profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  const progress = ((currentCard - 1) / (TOTAL_CARDS - 1)) * 100;

  return (
    <div className="relative overflow-hidden">
      {/* Progress bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-1 bg-stone-200"
        role="progressbar"
        aria-valuenow={currentCard}
        aria-valuemin={1}
        aria-valuemax={TOTAL_CARDS}
        aria-label={`Step ${currentCard} of ${TOTAL_CARDS}`}
      >
        <div
          className="h-full bg-gradient-to-r from-sage-400 to-sage-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card rendering — key forces re-mount on card change for clean transitions */}
      <div key={currentCard} className="card-enter-active">
        {currentCard === 1 && <WelcomeCard onNext={advanceCard} />}
        {currentCard === 2 && <ExpectationsCard onNext={advanceCard} />}
        {currentCard === 3 && <DataImportCard onNext={advanceCard} />}
        {currentCard === 4 && (
          <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
            <ProfilingWizard
              embedded
              initialAnswers={savedAnswers}
              onComplete={() => advanceCard()}
            />
          </div>
        )}
        {currentCard === 5 && <CheckInIntroCard onNext={advanceCard} />}
        {currentCard === 6 && <StreaksCard onNext={advanceCard} />}
        {currentCard === 7 && <ConnectAppsCard onNext={advanceCard} />}
        {currentCard === 8 && <DashboardTourCard onNext={advanceCard} />}
        {currentCard === 9 && <AIMentorCard onComplete={handleComplete} />}
      </div>
    </div>
  );
}
