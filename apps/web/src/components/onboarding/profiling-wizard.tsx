'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS, SECTIONS, getQuestionsForSection } from '@/lib/profiling/question-schema';
import type { RawAnswers, ProfileSummaryTemplate } from '@life-design/core';
import ProgressBar from './progress-bar';
import SectionHeader from './section-header';
import QuestionRenderer from './question-renderer';
import MentorIntro from './mentor-intro';
import ProfileSummary from './profile-summary';

type WizardPhase = 'loading' | 'section_intro' | 'question' | 'mentors' | 'completing' | 'summary';

export default function ProfilingWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState<WizardPhase>('loading');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<RawAnswers>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummaryTemplate | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Initialise session
  useEffect(() => {
    async function init() {
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
  }, [answers, currentSection, questionIndex]);

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
    const res = await fetch('/api/onboarding/complete', { method: 'POST' });
    const data = await res.json();
    setSummary(data.summary);
    setPhase('summary');
  }, []);

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
              value={answers[currentQuestion.id] ?? null}
              onChange={handleAnswer}
            />
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
