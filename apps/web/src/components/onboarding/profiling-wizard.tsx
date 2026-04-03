'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SECTIONS, getQuestionsForSection } from '@/lib/profiling/question-schema';
import type { RawAnswers, ProfileSummaryTemplate } from '@life-design/core';
import { createClient } from '@/lib/supabase/client';
import { useGuest } from '@/lib/guest-context';
import ProgressBar from './progress-bar';
import SectionHeader from './section-header';
import QuestionRenderer from './question-renderer';
import MentorIntro from './mentor-intro';
import ProfileSummary from './profile-summary';

type WizardPhase = 'loading' | 'section_intro' | 'question' | 'mentors' | 'completing' | 'summary';

export default function ProfilingWizard() {
  const router = useRouter();
  const { setProfile } = useGuest();
  const [phase, setPhase] = useState<WizardPhase>('loading');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<RawAnswers>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummaryTemplate | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [pendingMultiSelect, setPendingMultiSelect] = useState<string[] | null>(null);

  // Initialise session
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = !session;

      // Try to get user's name for personalized summary
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name.split(' ')[0]);
      } else if (session?.user?.email) {
        setUserName(session.user.email.split('@')[0]);
      }

      if (isGuest) {
        const savedSessionStr = localStorage.getItem('life-design-onboarding-session');
        if (savedSessionStr) {
          try {
            const statusData = JSON.parse(savedSessionStr);
            if (statusData.status === 'completed') {
              router.push('/dashboard');
              return;
            }
            setSessionId('guest-session');
            setAnswers(statusData.raw_answers ?? {});
            const sIdx = SECTIONS.findIndex((s) => s.id === statusData.current_section);
            if (sIdx >= 0) setSectionIndex(sIdx);
            setQuestionIndex(statusData.current_step ?? 0);
            setPhase('question');
            return;
          } catch (e) {
            console.error('Failed to parse guest session', e);
          }
        }
        setSessionId('guest-session');
        setPhase('section_intro');
        return;
      }

      // Check for existing session
      const statusRes = await fetch('/api/onboarding/status');
      const statusData = await statusRes.json();

      if (statusData.status === 'completed') {
        router.push('/dashboard');
        return;
      }

      if (statusData.status === 'in_progress') {
        setSessionId(statusData.session_id);
        setAnswers(statusData.raw_answers ?? {});
        // Resume position
        const sIdx = SECTIONS.findIndex((s) => s.id === statusData.current_section);
        if (sIdx >= 0) setSectionIndex(sIdx);
        setQuestionIndex(statusData.current_step ?? 0);
        setPhase('question');
        return;
      }

      // Start new session
      const startRes = await fetch('/api/onboarding/start', { method: 'POST' });
      const startData = await startRes.json();
      setSessionId(startData.session_id);
      setPhase('section_intro');
    }
    init();
  }, [router]);

  const currentSection = SECTIONS[sectionIndex];
  const sectionQuestions = currentSection ? getQuestionsForSection(currentSection.id) : [];
  const currentQuestion = sectionQuestions[questionIndex];

  const saveAnswer = useCallback(async (questionId: string, answer: string | string[] | number) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (sessionId === 'guest-session') {
      localStorage.setItem('life-design-onboarding-session', JSON.stringify({
        status: 'in_progress',
        raw_answers: newAnswers,
        current_section: currentSection?.id,
        current_step: questionIndex,
      }));
      return;
    }

    await fetch('/api/onboarding/answer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        answer,
        current_section: currentSection?.id,
        current_step: questionIndex,
      }),
    });
  }, [answers, currentSection, questionIndex, sessionId]);

  const handleAnswer = useCallback(async (value: string | string[] | number) => {
    if (!currentQuestion) return;
    await saveAnswer(currentQuestion.id, value);

    // Advance
    if (questionIndex < sectionQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else if (sectionIndex < SECTIONS.length - 1) {
      setSectionIndex((i) => i + 1);
      setQuestionIndex(0);
      setPhase('section_intro');
    } else {
      setPhase('mentors');
    }
  }, [currentQuestion, questionIndex, sectionQuestions.length, sectionIndex, saveAnswer]);

  const handleBack = useCallback(() => {
    if (phase === 'section_intro' && sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      const prevQuestions = getQuestionsForSection(SECTIONS[sectionIndex - 1].id);
      setQuestionIndex(prevQuestions.length - 1);
      setPhase('question');
    } else if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      const prevQuestions = getQuestionsForSection(SECTIONS[sectionIndex - 1].id);
      setQuestionIndex(prevQuestions.length - 1);
    }
  }, [phase, sectionIndex, questionIndex]);

  const handleComplete = useCallback(async () => {
    setPhase('completing');

    const buildFallbackSummary = (): ProfileSummaryTemplate => ({
      strength: 'You have the awareness to reflect on what matters',
      friction: 'Minor friction points — mostly manageable with the right structure',
      strategy: 'Start small, measure often, and adjust as you learn what works',
      this_week: 'This week: check in daily and notice what patterns emerge',
    });

    if (sessionId === 'guest-session') {
      try {
        const { normaliseRawAnswers, computeAllDerivedScores } = await import('@life-design/core');
        const { generateSummaryTemplate } = await import('@/lib/profiling/summary-templates');

        const normalised = normaliseRawAnswers(answers);
        const derived = computeAllDerivedScores(normalised);
        const summaryTemplate = generateSummaryTemplate(normalised, derived);

        setProfile({
          id: 'guest-user',
          ...normalised,
          ...derived,
          onboarded: true,
        } as any);

        localStorage.setItem('life-design-onboarding-session', JSON.stringify({
          status: 'completed',
          raw_answers: answers,
        }));

        setSummary(summaryTemplate);
        setPhase('summary');
      } catch (err) {
        console.error('Guest onboarding completion failed, using fallback summary', err);
        setProfile({ id: 'guest-user', onboarded: true } as any);
        localStorage.setItem('life-design-onboarding-session', JSON.stringify({
          status: 'completed',
          raw_answers: answers,
        }));
        setSummary(buildFallbackSummary());
        setPhase('summary');
      }
      return;
    }

    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (!data.summary) throw new Error('No summary in response');
      setSummary(data.summary);
      setPhase('summary');
    } catch (err) {
      console.error('Authenticated onboarding completion failed, computing client-side', err);
      try {
        const { normaliseRawAnswers, computeAllDerivedScores } = await import('@life-design/core');
        const { generateSummaryTemplate } = await import('@/lib/profiling/summary-templates');
        const normalised = normaliseRawAnswers(answers);
        const derived = computeAllDerivedScores(normalised);
        setSummary(generateSummaryTemplate(normalised, derived));
      } catch {
        setSummary(buildFallbackSummary());
      }
      setPhase('summary');
    }
  }, [sessionId, answers, setProfile]);

  if (phase === 'loading' || phase === 'completing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="animate-pulse text-[#A8A198]">Loading...</div>
      </div>
    );
  }

  const canGoBack = phase === 'question' && (questionIndex > 0 || sectionIndex > 0);

  if (phase === 'section_intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <SectionHeader
          label={currentSection.label}
          questionCount={currentSection.questionCount}
          onContinue={() => setPhase('question')}
        />
      </div>
    );
  }

  if (phase === 'question' && currentQuestion) {
    const isMultiSelect = currentQuestion.type === 'multi_select';
    const displayValue = isMultiSelect
      ? (pendingMultiSelect ?? (Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] as string[] : []))
      : (answers[currentQuestion.id] ?? null);

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <header className="sticky top-0 z-50 px-4 py-4 bg-[#FAFAF8]/80 backdrop-blur-sm">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {canGoBack && (
              <button onClick={handleBack} className="p-2 rounded-lg hover:bg-[#E8E4DD]/50" aria-label="Go back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div className="flex-1">
              <ProgressBar
                currentSection={currentSection.id}
                currentQuestionInSection={questionIndex}
                totalInSection={sectionQuestions.length}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-lg mx-auto space-y-6">
            <h2 className="font-['Instrument_Serif'] text-2xl text-[#1A1816]">
              {currentQuestion.question}
            </h2>
            <QuestionRenderer
              question={currentQuestion}
              value={displayValue}
              onChange={isMultiSelect
                ? (val) => setPendingMultiSelect(val as string[])
                : handleAnswer
              }
            />
            {isMultiSelect && (
              <button
                onClick={() => {
                  const val = pendingMultiSelect ?? [];
                  if (val.length > 0) {
                    setPendingMultiSelect(null);
                    handleAnswer(val);
                  }
                }}
                disabled={!(pendingMultiSelect && pendingMultiSelect.length > 0)}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A1816] text-white hover:bg-[#1A1816]/90"
              >
                Continue
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'mentors') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <MentorIntro onContinue={handleComplete} />
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAF8] to-[#F5F3EF]">
        <ProfileSummary
          userName={userName}
          summary={summary}
          onComplete={() => router.push('/dashboard')}
        />
      </div>
    );
  }

  return null;
}
