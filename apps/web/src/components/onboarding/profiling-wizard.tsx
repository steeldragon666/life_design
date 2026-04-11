'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SECTIONS, getQuestionsForSection } from '@/lib/profiling/question-schema';
import type { RawAnswers, ProfileSummaryTemplate, PsychometricProfile } from '@life-design/core';
import { createClient } from '@/lib/supabase/client';
import { useGuest } from '@/lib/guest-context';
import { encryptLocalStorageString, decryptLocalStorageString } from '@/lib/local-storage-crypto';
import { ChevronLeft } from 'lucide-react';
import ProgressBar from './progress-bar';
import SectionHeader from './section-header';
import QuestionRenderer from './question-renderer';
import MentorIntro from './mentor-intro';
import ProfileSummary from './profile-summary';
import { ConsentCard } from './cards/consent-card';
import { ClinicalScreeningForm } from '@/components/screening/clinical-screening-form';
import { CRISIS_RESOURCES } from '@life-design/core';

const SESSION_STORAGE_KEY = 'opt-in-onboarding-session';
const SESSION_CRYPTO_SCOPE = 'onboarding-session';

type WizardPhase = 'loading' | 'section_intro' | 'question' | 'clinical_consent' | 'clinical_phq9' | 'clinical_gad7' | 'mentors' | 'completing' | 'summary';

interface ProfilingWizardProps {
  embedded?: boolean;
  onComplete?: (answers: RawAnswers, summary: ProfileSummaryTemplate | null) => void;
  initialAnswers?: RawAnswers;
}

export default function ProfilingWizard({ embedded, onComplete: onEmbeddedComplete, initialAnswers }: ProfilingWizardProps) {
  const router = useRouter();
  const { setProfile } = useGuest();
  const [phase, setPhase] = useState<WizardPhase>('loading');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<RawAnswers>(initialAnswers ?? {});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummaryTemplate | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [psychometricProfile, setPsychometricProfile] = useState<PsychometricProfile | null>(null);
  const [psychometricNarrative, setPsychometricNarrative] = useState<string>('');
  const [pendingMultiSelect, setPendingMultiSelect] = useState<string[] | null>(null);
  const [clinicalSkipped, setClinicalSkipped] = useState(false);
  const [baselineScores, setBaselineScores] = useState<{ phq9?: number; gad7?: number }>({});
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  // Initialise session
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const isGuest = !user;

      // Try to get user's name for personalized summary
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      } else if (user?.email) {
        setUserName(user.email.split('@')[0]);
      }

      if (isGuest) {
        const rawSessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSessionStr) {
          try {
            const { plaintext } = await decryptLocalStorageString(rawSessionStr, SESSION_CRYPTO_SCOPE);
            const statusData = JSON.parse(plaintext ?? rawSessionStr);
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
      const sessionJson = JSON.stringify({
        status: 'in_progress',
        raw_answers: newAnswers,
        current_section: currentSection?.id,
        current_step: questionIndex,
      });
      encryptLocalStorageString(sessionJson, SESSION_CRYPTO_SCOPE).then((encrypted) => {
        localStorage.setItem(SESSION_STORAGE_KEY, encrypted);
      });
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
    } else if (embedded && onEmbeddedComplete) {
      onEmbeddedComplete(answers, null);
    } else {
      setPhase('clinical_consent');
    }
  }, [currentQuestion, questionIndex, sectionQuestions.length, sectionIndex, saveAnswer, embedded, onEmbeddedComplete, answers]);

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
        const { normaliseRawAnswers, computeAllDerivedScores, computePsychometricProfile } = await import('@life-design/core');
        const { generateSummaryTemplate } = await import('@/lib/profiling/summary-templates');

        const normalised = normaliseRawAnswers(answers);
        const derived = computeAllDerivedScores(normalised);
        const summaryTemplate = generateSummaryTemplate(normalised, derived);

        setProfile({
          id: 'guest-user',
          ...normalised,
          ...derived,
          onboarded: true,
        });

        // Set onboarded cookie synchronously so middleware allows /dashboard
        // before the GuestProvider useEffect fires.
        document.cookie = 'opt-in-guest-onboarded=1; Path=/; Max-Age=2592000; SameSite=Lax';

        const completedJson = JSON.stringify({ status: 'completed', raw_answers: answers });
        encryptLocalStorageString(completedJson, SESSION_CRYPTO_SCOPE).then((enc) => {
          localStorage.setItem(SESSION_STORAGE_KEY, enc);
        });

        // Compute psychometric profile client-side for guest users
        const psychometricResponses: Record<string, number> = {};
        for (const [key, value] of Object.entries(answers)) {
          if (
            key.startsWith('perma_') ||
            key.startsWith('tipi_') ||
            key.startsWith('grit_') ||
            key.startsWith('swls_') ||
            key.startsWith('bpns_')
          ) {
            psychometricResponses[key] = Number(value);
          }
        }
        if (Object.keys(psychometricResponses).length >= 25) {
          const psych = computePsychometricProfile(psychometricResponses);
          setPsychometricProfile(psych);
        }

        setSummary(summaryTemplate);
        setPhase('summary');
      } catch (err) {
        console.error('Guest onboarding completion failed, using fallback summary', err);
        setProfile({ id: 'guest-user', onboarded: true });
        document.cookie = 'opt-in-guest-onboarded=1; Path=/; Max-Age=2592000; SameSite=Lax';
        const fallbackJson = JSON.stringify({ status: 'completed', raw_answers: answers });
        encryptLocalStorageString(fallbackJson, SESSION_CRYPTO_SCOPE).then((enc) => {
          localStorage.setItem(SESSION_STORAGE_KEY, enc);
        });
        setSummary(buildFallbackSummary());
        setPhase('summary');
      }
      return;
    }

    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (res.status === 400) {
        // Insufficient answers — send user back to continue answering
        const errData = await res.json().catch(() => ({ error: 'Please answer more questions.' }));
        alert(errData.error || 'Please answer more questions before completing.');
        setPhase('question');
        return;
      }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (!data.summary) throw new Error('No summary in response');
      setSummary(data.summary);

      // Compute psychometric profile client-side for display (the full profile
      // is saved server-side but not returned to minimize data exposure)
      const { computePsychometricProfile } = await import('@life-design/core');
      const psychResponses: Record<string, number> = {};
      for (const [key, value] of Object.entries(answers)) {
        if (key.startsWith('perma_') || key.startsWith('tipi_') || key.startsWith('grit_') || key.startsWith('swls_') || key.startsWith('bpns_')) {
          psychResponses[key] = Number(value);
        }
      }
      if (Object.keys(psychResponses).length >= 25) {
        setPsychometricProfile(computePsychometricProfile(psychResponses));
      }
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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  const canGoBack = phase === 'question' && (questionIndex > 0 || sectionIndex > 0);

  if (phase === 'section_intro') {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}>
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
      <div className={`flex flex-col ${embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}`}>
        <header className="sticky top-0 z-50 px-4 py-4 bg-stone-50/80 backdrop-blur-sm">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {canGoBack && (
              <button onClick={handleBack} className="p-2 rounded-lg hover:bg-stone-200/50" aria-label="Go back">
                <ChevronLeft size={20} />
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
            <h2 className="font-serif text-2xl text-stone-900">
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
                className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-stone-900 text-white hover:bg-stone-900/90"
              >
                Continue
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'clinical_consent') {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-lg mx-auto">
            <ConsentCard
              onConsent={() => setPhase('clinical_phq9')}
              onSkip={() => {
                setClinicalSkipped(true);
                setAnswers((prev) => ({ ...prev, clinical_skipped: 1 }));
                setPhase('mentors');
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'clinical_phq9') {
    if (showCrisisResources) {
      return (
        <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="max-w-lg mx-auto space-y-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
                <h2 className="font-serif text-xl text-stone-900">Support is available</h2>
                <p className="text-sm text-stone-700 leading-relaxed">
                  We noticed your response indicates you may be going through a difficult time.
                  You are not alone, and there are people who want to help. Please consider
                  reaching out to one of these services.
                </p>
                <ul className="space-y-3">
                  {CRISIS_RESOURCES.map((resource) => (
                    <li key={resource.phone} className="rounded-lg border border-amber-100 bg-white p-3">
                      <div className="font-medium text-stone-900">{resource.name}</div>
                      <a
                        href={`tel:${resource.phone.replace(/\s/g, '')}`}
                        className="text-sage-700 underline text-sm font-semibold"
                      >
                        {resource.phone}
                      </a>
                      <p className="text-xs text-stone-500 mt-0.5">{resource.description}</p>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowCrisisResources(false)}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 bg-stone-900 text-white hover:bg-stone-900/90"
                >
                  I understand, continue
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="font-serif text-2xl text-stone-900">Depression Screening (PHQ-9)</h2>
            <ClinicalScreeningForm
              instrument="phq9"
              onComplete={(result) => {
                setBaselineScores((prev) => ({ ...prev, phq9: result.score }));
                setPhase('clinical_gad7');
              }}
              onCriticalFlag={() => {
                setShowCrisisResources(true);
                setAnswers((prev) => ({ ...prev, clinical_phq9_critical: 1 }));
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'clinical_gad7') {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-stone-50 to-stone-100'}>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="font-serif text-2xl text-stone-900">Anxiety Screening (GAD-7)</h2>
            <ClinicalScreeningForm
              instrument="gad7"
              onComplete={(result) => {
                setBaselineScores((prev) => ({ ...prev, gad7: result.score }));
                // Store baseline scores in answers for persistence
                setAnswers((prevAnswers) => ({
                  ...prevAnswers,
                  clinical_phq9_score: baselineScores.phq9 ?? 0,
                  clinical_gad7_score: result.score,
                }));
                setPhase('mentors');
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'mentors') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
        <MentorIntro onContinue={handleComplete} />
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
        <ProfileSummary
          userName={userName}
          summary={summary}
          psychometric={psychometricProfile}
          psychometricNarrative={psychometricNarrative}
          onComplete={() => router.push('/dashboard')}
        />
      </div>
    );
  }

  return null;
}
