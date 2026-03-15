'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGuest } from '@/lib/guest-context';
import { ALL_DIMENSIONS, Dimension, DIMENSION_LABELS, DurationType } from '@life-design/core';
import { db } from '@/lib/db';
import { BadgeSystem } from '@/lib/achievements/badge-system';
import type { BadgeDefinition } from '@/lib/achievements/badge-definitions';
import BadgeUnlockModal from '@/components/achievements/BadgeUnlockModal';
import SmartJournalPrompt from '@/components/check-in/SmartJournalPrompt';
import { getSmartJournalPrompts } from '@/lib/smart-prompts';
import VoiceCheckin from '@/components/checkin/voice-checkin';
import { useAnalysisPipeline } from '@/providers/LifeDesignProvider';
import type { DBCheckIn } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DIMENSION_META: Record<string, { emoji: string; question: string }> = {
  career: { emoji: '\u{1F3AF}', question: 'How fulfilled do you feel at work?' },
  finance: { emoji: '\u{2728}', question: 'How secure do you feel financially?' },
  health: { emoji: '\u{1F33F}', question: 'How is your physical wellbeing today?' },
  fitness: { emoji: '\u{1F4AA}', question: 'How active and energised do you feel?' },
  family: { emoji: '\u{1F3E1}', question: 'How connected do you feel to family?' },
  social: { emoji: '\u{1F91D}', question: 'How are your social connections today?' },
  romance: { emoji: '\u{1F496}', question: 'How fulfilled is your romantic life?' },
  growth: { emoji: '\u{1F4D6}', question: 'How much did you learn or grow today?' },
};

const moodOptions = [
  { value: 1, label: 'Struggling', color: '#D4864A' },
  { value: 2, label: 'Low', color: '#E8A46D' },
  { value: 3, label: 'Neutral', color: '#A8A198' },
  { value: 4, label: 'Good', color: '#9BB89B' },
  { value: 5, label: 'Thriving', color: '#5A7F5A' },
];

// Map 5-point mood scale to 1-10 for storage
function moodTo10(mood5: number): number {
  return mood5 * 2;
}

interface CheckInClientProps {
  date: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckInClient({ date }: CheckInClientProps) {
  const router = useRouter();
  const { addCheckin, appendConversationSummary } = useGuest();

  // Wizard state: 0 = mood, 1-8 = dimensions, 9 = smart prompt, 10 = reflection, 11 = complete
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<BadgeDefinition | null>(null);

  const analysisPipeline = useAnalysisPipeline();
  const [showVoice, setShowVoice] = useState(false);

  const totalSteps = 11;
  const progress = ((step + 1) / (totalSteps + 1)) * 100;

  const handleDimensionScore = (dim: string, score: number) => {
    setScores(prev => ({ ...prev, [dim]: score }));
  };

  const canProceed = () => {
    if (step === 0) return mood !== null;
    if (step >= 1 && step <= 8) return scores[ALL_DIMENSIONS[step - 1]] !== undefined;
    if (step === 9) return true; // SmartJournalPrompt is optional
    if (step === 10) return true; // Reflection is optional
    return false;
  };

  const handleNext = () => {
    if (step === 10) {
      submitCheckin();
    } else {
      setStep(step + 1);
    }
  };

  async function submitCheckin() {
    if (mood === null || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const dimensionScores = ALL_DIMENSIONS
        .filter(dim => scores[dim] !== undefined)
        .map(dim => ({
          dimension: dim,
          score: scores[dim],
        }));

      addCheckin({
        id: `checkin-${Date.now()}`,
        date,
        mood: moodTo10(mood),
        duration_type: DurationType.Deep,
        journal_entry: reflection || undefined,
        dimension_scores: dimensionScores,
      });

      // Also write to Dexie for badge system
      const dexieCheckIn = {
        date,
        mood: moodTo10(mood),
        dimensionScores: Object.fromEntries(
          dimensionScores.map(ds => [ds.dimension, ds.score])
        ) as Partial<Record<Dimension, number>>,
        tags: [],
        createdAt: new Date(),
      };
      await db.checkIns.add(dexieCheckIn);

      // Check for newly earned badges
      const badgeSystem = new BadgeSystem(db);
      const newBadges = await badgeSystem.checkAfterCheckIn(dexieCheckIn as typeof dexieCheckIn & { id?: number });
      if (newBadges.length > 0) {
        setEarnedBadge(newBadges[0]);
      }

      // Run incremental analysis pipeline (non-blocking)
      analysisPipeline.runIncrementalAnalysis(dexieCheckIn as DBCheckIn).catch(() => {});

      appendConversationSummary(`Submitted check-in with mood ${moodTo10(mood)}/10.`, 'checkin');
      setStep(11); // Show completion screen
    } catch {
      setError('Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Daily Check-in</h1>
        <p className="text-sm text-[#A8A198] mt-1">Take a moment to reflect on your day</p>
      </div>

      {/* Progress Bar */}
      {step < 11 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#A8A198] uppercase tracking-wider font-medium">
              Step {step + 1} of {totalSteps + 1}
            </span>
            <span className="text-[10px] font-['DM_Mono'] text-[#5A7F5A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-[#F5F3EF] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#9BB89B] to-[#5A7F5A] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-[#FEF7F0] border border-[#E8A46D]/30">
          <p className="text-sm text-[#D4864A]">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="animate-fade-up" key={step}>
        {/* Step 0: Mood */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
              <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623] mb-2">How are you feeling overall?</h2>
              <p className="text-sm text-[#A8A198] mb-6">Be honest &mdash; there&rsquo;s no wrong answer</p>

              <div className="flex gap-3">
                {moodOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center
                      ${mood === option.value
                        ? 'border-[#5A7F5A] bg-[#F4F7F4] shadow-sm'
                        : 'border-[#E8E4DD] hover:border-[#C4D5C4] bg-white'
                      }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: option.color + '20' }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                    </div>
                    <p className="text-xs font-medium text-[#5C554C]">{option.label}</p>
                  </button>
                ))}
              </div>

              {/* Voice check-in option */}
              <div className="mt-4 pt-4 border-t border-[#E8E4DD]/40">
                <button
                  onClick={() => setShowVoice(!showVoice)}
                  className="flex items-center gap-2 text-sm text-[#7D756A] hover:text-[#5A7F5A] transition-colors"
                >
                  <MicIcon className="w-4 h-4" />
                  {showVoice ? 'Hide voice check-in' : 'Or use voice check-in'}
                </button>
                {showVoice && (
                  <div className="mt-3">
                    <VoiceCheckin />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Steps 1-8: Dimension scores */}
        {step >= 1 && step <= 8 && (() => {
          const dim = ALL_DIMENSIONS[step - 1];
          const meta = DIMENSION_META[dim] ?? { emoji: '\u{2B50}', question: `How do you feel about ${dim}?` };
          const label = DIMENSION_LABELS[dim] ?? dim;

          return (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623]">{label}</h2>
                    <p className="text-sm text-[#A8A198]">{meta.question}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                    const isSelected = scores[dim] === score;
                    const isInRange = scores[dim] !== undefined && score <= scores[dim];
                    return (
                      <button
                        key={score}
                        onClick={() => handleDimensionScore(dim, score)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                          ${isSelected
                            ? 'bg-[#5A7F5A] text-white shadow-sm'
                            : isInRange
                              ? 'bg-[#E4ECE4] text-[#5A7F5A]'
                              : 'bg-[#F5F3EF] text-[#A8A198] hover:bg-[#E8E4DD]'
                          }`}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-[#A8A198]">Struggling</span>
                  <span className="text-[10px] text-[#A8A198]">Thriving</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Step 9: Smart Journal Prompt */}
        {step === 9 && (() => {
          const dimScores = ALL_DIMENSIONS
            .filter(dim => scores[dim] !== undefined)
            .map(dim => ({ dimension: dim, score: scores[dim] }));
          const prompts = getSmartJournalPrompts(dimScores, 1);
          const prompt = prompts[0];

          return prompt ? (
            <div className="space-y-6">
              <SmartJournalPrompt
                prompt={{ text: prompt.prompt, dimension: prompt.dimension as any, priority: 1, type: 'dimension_low' }}
                onSelectPrompt={(text) => setReflection(text + '\n\n')}
                onRequestNew={() => {}}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
                <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623] mb-2">Journal Prompt</h2>
                <p className="text-sm text-[#A8A198]">No targeted prompt available — proceed to write your reflection freely.</p>
              </div>
            </div>
          );
        })()}

        {/* Step 10: Reflection */}
        {step === 10 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
              <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623] mb-2">Today&rsquo;s Reflection</h2>
              <p className="text-sm text-[#A8A198] mb-4">What&rsquo;s on your mind? Any wins, challenges, or thoughts?</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full h-40 p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E4DD] text-sm text-[#3D3833] resize-none focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 focus:border-[#9BB89B] placeholder:text-[#C4C0B8]"
                placeholder="Today I felt grateful for..."
              />
            </div>
          </div>
        )}

        {/* Step 11: Complete */}
        {step === 11 && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E4ECE4] to-[#C4D5C4] flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-10 h-10 text-[#5A7F5A]" />
            </div>
            <div>
              <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">Check-in Complete</h2>
              <p className="text-sm text-[#A8A198] max-w-sm mx-auto">
                Beautiful. Your reflections are saved and your AI coach will generate new insights shortly.
              </p>
            </div>

            {/* Mini summary */}
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60 max-w-sm mx-auto text-left">
              <p className="text-xs text-[#A8A198] uppercase tracking-wider mb-3 font-medium">Today&rsquo;s Snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_DIMENSIONS.filter(dim => scores[dim] !== undefined).map(dim => (
                  <div key={dim} className="flex items-center gap-2">
                    <div className="w-6 h-1.5 rounded-full bg-[#F5F3EF] overflow-hidden">
                      <div className="h-full rounded-full bg-[#9BB89B]" style={{ width: `${scores[dim] * 10}%` }} />
                    </div>
                    <span className="text-[11px] text-[#7D756A]">{DIMENSION_LABELS[dim]}</span>
                    <span className="text-[10px] font-['DM_Mono'] text-[#5A7F5A] ml-auto">{scores[dim]}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
            >
              View Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < 11 && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[#E8E4DD] text-sm font-medium text-[#7D756A] hover:bg-[#F5F3EF] transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex-1 px-6 py-3 rounded-2xl text-sm font-medium transition-all
              ${canProceed()
                ? 'bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white shadow-sm hover:shadow-md'
                : 'bg-[#F5F3EF] text-[#C4C0B8] cursor-not-allowed'
              }`}
          >
            {step === 10 ? 'Complete Check-in' : 'Continue'}
          </button>
        </div>
      )}

      {/* Badge Unlock Modal */}
      {earnedBadge && (
        <BadgeUnlockModal badge={earnedBadge} onClose={() => setEarnedBadge(null)} />
      )}
    </div>
  );
}
