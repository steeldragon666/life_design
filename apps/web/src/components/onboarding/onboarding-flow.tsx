'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  const [currentCard, setCurrentCard] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savedAnswers, setSavedAnswers] = useState<RawAnswers>({});

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/onboarding/status');
      const data = await res.json();

      if (data.status === 'completed') {
        router.push('/dashboard');
        return;
      }

      if (data.current_card) setCurrentCard(data.current_card);
      if (data.raw_answers) setSavedAnswers(data.raw_answers);
      setLoading(false);
    }
    init();
  }, [router]);

  const advanceCard = useCallback(async () => {
    const next = currentCard + 1;
    setCurrentCard(next);

    localStorage.setItem('opt-in-onboarding-card', String(next));
    await fetch('/api/onboarding/card', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_card: next }),
    }).catch(() => {});
  }, [currentCard]);

  const handleComplete = useCallback(async () => {
    await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('opt-in-onboarding-card');
    router.push('/dashboard');
  }, [router]);

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
