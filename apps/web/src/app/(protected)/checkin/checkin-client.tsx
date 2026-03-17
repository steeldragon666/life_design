'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import PredictiveSliderGroup from '@/components/checkin/predictive-slider-group';
import SpotifyReflection from '@/components/checkin/spotify-reflection';
import { useAnalysisPipeline } from '@/providers/LifeDesignProvider';
import type { DBCheckIn } from '@/lib/db/schema';
import type { PredictionResult } from '@/lib/ml/types';
import { TrainingClient } from '@/lib/ml/training-client';
import { FeaturePipeline, getFeatureConfidence } from '@/lib/ml/feature-pipeline';
import { CheckCircle, ArrowLeft, Microphone } from '@phosphor-icons/react/dist/ssr';
import { Button, Card, Textarea } from '@life-design/ui';

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

/** Map 5-point mood scale to 1-10 for storage */
function moodTo10(mood5: number): number {
  return mood5 * 2;
}

/** Map model's 1-10 prediction to 1-5 display scale */
function moodTo5(mood10: number): number {
  return Math.max(1, Math.min(5, Math.round(mood10 / 2)));
}

/** Minimum feature confidence to enable predictive mode */
const PREDICTIVE_CONFIDENCE_THRESHOLD = 0.3;

/** Delta threshold: if no slider moved > this, the user accepted AI predictions */
const DELTA_THRESHOLD = 1;

interface CheckInClientProps {
  date: string;
}

// ---------------------------------------------------------------------------
// Spotify data shape for the reflection component
// ---------------------------------------------------------------------------

interface SpotifyData {
  artistName: string;
  trackNames: string[];
  listeningMinutes: number;
  audioValence: number;
  audioEnergy: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckInClient({ date }: CheckInClientProps) {
  const { addCheckin, appendConversationSummary } = useGuest();
  const analysisPipeline = useAnalysisPipeline();

  // -----------------------------------------------------------------------
  // Prediction state (Mode A vs Mode B)
  // -----------------------------------------------------------------------
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const trainingClientRef = useRef<TrainingClient | null>(null);

  const isPredictiveMode = prediction !== null;

  // -----------------------------------------------------------------------
  // Wizard state
  // -----------------------------------------------------------------------
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<BadgeDefinition | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  // Track whether user explicitly confirmed AI predictions without adjusting
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [userAdjustedSliders, setUserAdjustedSliders] = useState(false);

  // -----------------------------------------------------------------------
  // On mount: try to load prediction
  // -----------------------------------------------------------------------
  useEffect(() => {
    let disposed = false;

    async function loadPrediction() {
      try {
        const pipeline = new FeaturePipeline();
        const today = new Date(date);
        const features = await pipeline.extract(today);
        const confidence = await getFeatureConfidence(today);

        if (disposed) return;

        if (confidence < PREDICTIVE_CONFIDENCE_THRESHOLD) {
          setPredictionLoading(false);
          return;
        }

        const client = new TrainingClient();
        trainingClientRef.current = client;

        const result = await client.predict(features);
        if (disposed) return;

        setPrediction(result);
      } catch {
        // Prediction failed — fall back to Mode B (manual wizard)
      } finally {
        if (!disposed) setPredictionLoading(false);
      }
    }

    // Also try to load Spotify data for the reflection step
    async function loadSpotifyData() {
      try {
        const dateStr = date;
        const existing = await db.spotifyReflections
          .where('date')
          .equals(dateStr)
          .first();

        // If there's already a reflection, skip spotify step
        if (existing) return;

        // Try to get Spotify data from connectedAppData
        const spotifyAppData = await db.connectedAppData
          .where('provider')
          .equals('spotify')
          .last();

        if (spotifyAppData?.processedMetrics && spotifyAppData.rawData) {
          const raw = spotifyAppData.rawData as Record<string, unknown>;
          const recentTracks = (raw.recentTracks ?? []) as Array<{
            name: string;
            artist: string;
          }>;

          if (recentTracks.length > 0) {
            setSpotifyData({
              artistName: recentTracks[0]?.artist ?? 'Unknown Artist',
              trackNames: recentTracks.map((t) => t.name),
              listeningMinutes: (spotifyAppData.processedMetrics.listeningMinutes as number) ?? 0,
              audioValence: (spotifyAppData.processedMetrics.audioValence as number) ?? 0.5,
              audioEnergy: (spotifyAppData.processedMetrics.audioEnergy as number) ?? 0.5,
            });
          }
        }
      } catch {
        // Spotify data not available — skip step
      }
    }

    loadPrediction();
    loadSpotifyData();

    return () => {
      disposed = true;
      trainingClientRef.current?.dispose();
    };
  }, [date]);

  // -----------------------------------------------------------------------
  // Step logic (varies by mode)
  // -----------------------------------------------------------------------

  // Mode A steps: 0=Mood, 1=PredictiveSliders, 2=SpotifyReflection, 3=SmartPrompt, 4=Reflection, 5=Complete
  // Mode B steps: 0=Mood, 1-8=Dimensions, 9=SmartPrompt, 10=Reflection, 11=Complete

  const totalStepsModeA = spotifyData ? 5 : 4; // Skip Spotify if no data
  const totalStepsModeB = 11;
  const totalSteps = isPredictiveMode ? totalStepsModeA : totalStepsModeB;
  const completeStep = isPredictiveMode ? (spotifyData ? 5 : 4) : 11;

  const progress = ((step + 1) / (totalSteps + 1)) * 100;

  // -----------------------------------------------------------------------
  // Map Mode A step numbers to logical steps
  // -----------------------------------------------------------------------

  const getModeALogicalStep = useCallback(
    (currentStep: number): 'mood' | 'predictive' | 'spotify' | 'journal' | 'reflection' | 'complete' => {
      if (currentStep === 0) return 'mood';
      if (currentStep === 1) return 'predictive';
      if (spotifyData) {
        if (currentStep === 2) return 'spotify';
        if (currentStep === 3) return 'journal';
        if (currentStep === 4) return 'reflection';
        return 'complete';
      }
      // No Spotify data: skip from step 1 straight to journal at step 2
      if (currentStep === 2) return 'journal';
      if (currentStep === 3) return 'reflection';
      return 'complete';
    },
    [spotifyData],
  );

  // -----------------------------------------------------------------------
  // Navigation helpers
  // -----------------------------------------------------------------------

  const handleDimensionScore = (dim: string, score: number) => {
    setScores((prev) => ({ ...prev, [dim]: score }));
  };

  const canProceed = () => {
    if (isPredictiveMode) {
      const logical = getModeALogicalStep(step);
      if (logical === 'mood') return mood !== null;
      if (logical === 'predictive') return aiConfirmed || Object.keys(scores).length > 0;
      if (logical === 'spotify') return true; // SpotifyReflection handles its own completion
      if (logical === 'journal') return true;
      if (logical === 'reflection') return true;
      return false;
    }

    // Mode B
    if (step === 0) return mood !== null;
    if (step >= 1 && step <= 8) return scores[ALL_DIMENSIONS[step - 1]] !== undefined;
    if (step === 9) return true;
    if (step === 10) return true;
    return false;
  };

  const handleNext = () => {
    if (isPredictiveMode) {
      const logical = getModeALogicalStep(step);
      if (logical === 'reflection') {
        submitCheckin();
      } else {
        setStep(step + 1);
      }
    } else {
      if (step === 10) {
        submitCheckin();
      } else {
        setStep(step + 1);
      }
    }
  };

  // -----------------------------------------------------------------------
  // Predictive mode callbacks
  // -----------------------------------------------------------------------

  const handlePredictiveScoresChange = useCallback(
    (newScores: Partial<Record<Dimension, number>>) => {
      setScores((prev) => {
        const merged = { ...prev };
        for (const [dim, val] of Object.entries(newScores)) {
          if (val !== undefined) merged[dim] = val;
        }
        return merged;
      });

      // Check if any score differs from prediction by > DELTA_THRESHOLD
      if (prediction) {
        const hasAdjusted = ALL_DIMENSIONS.some((dim) => {
          const userVal = newScores[dim];
          if (userVal === undefined) return false;
          const predicted = Math.round(prediction.scores[dim]);
          return Math.abs(userVal - predicted) > DELTA_THRESHOLD;
        });
        setUserAdjustedSliders(hasAdjusted);
      }
    },
    [prediction],
  );

  const handleConfirmAll = useCallback(() => {
    setAiConfirmed(true);
    // Populate scores with AI predictions for any unset dimensions
    if (prediction) {
      setScores((prev) => {
        const merged = { ...prev };
        for (const dim of ALL_DIMENSIONS) {
          if (merged[dim] === undefined) {
            merged[dim] = Math.round(prediction.scores[dim]);
          }
        }
        return merged;
      });
    }
  }, [prediction]);

  const handleSpotifyComplete = useCallback(
    (_response: { mood: string; freeText?: string }) => {
      // Advance to next step after Spotify reflection is done
      setStep((prev) => prev + 1);
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  async function submitCheckin() {
    if (mood === null || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const dimensionScores = ALL_DIMENSIONS.filter((dim) => scores[dim] !== undefined).map(
        (dim) => ({
          dimension: dim,
          score: scores[dim],
        }),
      );

      // Determine ai_accepted flag
      const ai_accepted = isPredictiveMode && aiConfirmed && !userAdjustedSliders;

      addCheckin({
        id: `checkin-${Date.now()}`,
        date,
        mood: moodTo10(mood),
        duration_type: isPredictiveMode ? DurationType.Quick : DurationType.Deep,
        journal_entry: reflection || undefined,
        dimension_scores: dimensionScores,
      });

      // Also write to Dexie for badge system
      const dexieCheckIn = {
        date,
        mood: moodTo10(mood),
        dimensionScores: Object.fromEntries(
          dimensionScores.map((ds) => [ds.dimension, ds.score]),
        ) as Partial<Record<Dimension, number>>,
        tags: [],
        ai_accepted,
        createdAt: new Date(),
      };
      await db.checkIns.add(dexieCheckIn);

      // Check for newly earned badges
      const badgeSystem = new BadgeSystem(db);
      const newBadges = await badgeSystem.checkAfterCheckIn(
        dexieCheckIn as typeof dexieCheckIn & { id?: number },
      );
      if (newBadges.length > 0) {
        setEarnedBadge(newBadges[0]);
      }

      // Run incremental analysis pipeline (non-blocking)
      analysisPipeline.runIncrementalAnalysis(dexieCheckIn as DBCheckIn).catch(() => {});

      appendConversationSummary(
        `Submitted check-in with mood ${moodTo10(mood)}/10${ai_accepted ? ' (AI-predicted)' : ''}.`,
        'checkin',
      );
      setStep(completeStep);
    } catch {
      setError('Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Mood step with optional ghost prediction
  // -----------------------------------------------------------------------

  const predictedMood5 = prediction ? moodTo5(prediction.mood) : null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Show a loading state while we check for predictions
  if (predictionLoading) {
    return (
      <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">Daily Check-in</h1>
          <p className="text-sm text-stone-500 mt-1">Preparing your check-in...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">Daily Check-in</h1>
        <p className="text-sm text-stone-500 mt-1">
          {isPredictiveMode
            ? 'AI-assisted check-in based on your patterns'
            : 'Take a moment to reflect on your day'}
        </p>
      </div>

      {/* Progress Bar */}
      {step < completeStep && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-stone-500 uppercase tracking-wider font-medium">
              Step {step + 1} of {totalSteps + 1}
            </span>
            <span className="text-[11px] font-mono text-sage-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sage-300 to-sage-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-warm-50 border border-warm-300/30">
          <p className="text-sm text-warm-500">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="animate-fade-up" key={step}>
        {/* ================================================================= */}
        {/* MODE A: Predictive check-in                                       */}
        {/* ================================================================= */}
        {isPredictiveMode && (() => {
          const logical = getModeALogicalStep(step);

          // Step 0: Mood (with ghost prediction)
          if (logical === 'mood') {
            return (
              <div className="space-y-6">
                <Card>
                  <h2 className="font-serif text-2xl text-stone-800 mb-2">
                    How are you feeling overall?
                  </h2>
                  <p className="text-sm text-stone-500 mb-6">
                    Be honest &mdash; there&rsquo;s no wrong answer
                  </p>

                  <div className="flex gap-3">
                    {moodOptions.map((option) => {
                      const isPredicted = predictedMood5 === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setMood(option.value)}
                          className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center relative
                            ${
                              mood === option.value
                                ? 'border-sage-500 bg-sage-50 shadow-sm'
                                : 'border-stone-200 hover:border-sage-200 bg-white'
                            }`}
                        >
                          {/* Ghost indicator for AI prediction */}
                          {isPredicted && mood !== option.value && (
                            <div
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: '#5A7F5A30',
                                border: '1.5px solid #5A7F5A60',
                              }}
                              title="AI prediction"
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: '#5A7F5A' }}
                              />
                            </div>
                          )}
                          <div
                            className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: option.color + '20' }}
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                          </div>
                          <p className="text-xs font-medium text-stone-600">{option.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Voice check-in option */}
                  <div className="mt-4 pt-4 border-t border-stone-200/40">
                    <button
                      onClick={() => setShowVoice(!showVoice)}
                      className="flex items-center gap-2 text-sm text-stone-500 hover:text-sage-500 transition-colors"
                    >
                      <Microphone size={16} weight="regular" />
                      {showVoice ? 'Hide voice check-in' : 'Or use voice check-in'}
                    </button>
                    {showVoice && (
                      <div className="mt-3">
                        <VoiceCheckin />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          }

          // Step 1: Predictive slider group
          if (logical === 'predictive') {
            return (
              <PredictiveSliderGroup
                prediction={prediction}
                onScoresChange={handlePredictiveScoresChange}
                onConfirmAll={handleConfirmAll}
              />
            );
          }

          // Step 2: Spotify Reflection (if available)
          if (logical === 'spotify' && spotifyData) {
            return (
              <SpotifyReflection
                date={date}
                spotifyData={spotifyData}
                onComplete={handleSpotifyComplete}
              />
            );
          }

          // Step 3: Smart Journal Prompt
          if (logical === 'journal') {
            const dimScores = ALL_DIMENSIONS.filter((dim) => scores[dim] !== undefined).map(
              (dim) => ({ dimension: dim, score: scores[dim] }),
            );
            const prompts = getSmartJournalPrompts(dimScores, 1);
            const prompt = prompts[0];

            return prompt ? (
              <div className="space-y-6">
                <SmartJournalPrompt
                  prompt={{
                    text: prompt.prompt,
                    dimension: prompt.dimension as string,
                    priority: 1,
                    type: 'dimension_low',
                  }}
                  onSelectPrompt={(text) => setReflection(text + '\n\n')}
                  onRequestNew={() => {}}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <h2 className="font-serif text-2xl text-stone-800 mb-2">Journal Prompt</h2>
                  <p className="text-sm text-stone-500">
                    No targeted prompt available &mdash; proceed to write your reflection freely.
                  </p>
                </Card>
              </div>
            );
          }

          // Step 4: Reflection
          if (logical === 'reflection') {
            return (
              <div className="space-y-6">
                <Card>
                  <h2 className="font-serif text-2xl text-stone-800 mb-2">
                    Today&rsquo;s Reflection
                  </h2>
                  <p className="text-sm text-stone-500 mb-4">
                    What&rsquo;s on your mind? Any wins, challenges, or thoughts?
                  </p>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="h-40"
                    placeholder="Today I felt grateful for..."
                  />
                </Card>
              </div>
            );
          }

          // Complete
          return null;
        })()}

        {/* ================================================================= */}
        {/* MODE B: Traditional 12-step wizard                                */}
        {/* ================================================================= */}
        {!isPredictiveMode && (
          <>
            {/* Step 0: Mood */}
            {step === 0 && (
              <div className="space-y-6">
                <Card>
                  <h2 className="font-serif text-2xl text-stone-800 mb-2">
                    How are you feeling overall?
                  </h2>
                  <p className="text-sm text-stone-500 mb-6">
                    Be honest &mdash; there&rsquo;s no wrong answer
                  </p>

                  <div className="flex gap-3">
                    {moodOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center
                          ${
                            mood === option.value
                              ? 'border-sage-500 bg-sage-50 shadow-sm'
                              : 'border-stone-200 hover:border-sage-200 bg-white'
                          }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                          style={{ backgroundColor: option.color + '20' }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                        </div>
                        <p className="text-xs font-medium text-stone-600">{option.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* Voice check-in option */}
                  <div className="mt-4 pt-4 border-t border-stone-200/40">
                    <button
                      onClick={() => setShowVoice(!showVoice)}
                      className="flex items-center gap-2 text-sm text-stone-500 hover:text-sage-500 transition-colors"
                    >
                      <Microphone size={16} weight="regular" />
                      {showVoice ? 'Hide voice check-in' : 'Or use voice check-in'}
                    </button>
                    {showVoice && (
                      <div className="mt-3">
                        <VoiceCheckin />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Steps 1-8: Dimension scores */}
            {step >= 1 &&
              step <= 8 &&
              (() => {
                const dim = ALL_DIMENSIONS[step - 1];
                const meta = DIMENSION_META[dim] ?? {
                  emoji: '\u{2B50}',
                  question: `How do you feel about ${dim}?`,
                };
                const label = DIMENSION_LABELS[dim] ?? dim;

                return (
                  <div className="space-y-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div>
                          <h2 className="font-serif text-2xl text-stone-800">{label}</h2>
                          <p className="text-sm text-stone-500">{meta.question}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                          const isSelected = scores[dim] === score;
                          const isInRange =
                            scores[dim] !== undefined && score <= scores[dim];
                          return (
                            <button
                              key={score}
                              onClick={() => handleDimensionScore(dim, score)}
                              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                                ${
                                  isSelected
                                    ? 'bg-sage-500 text-white shadow-sm'
                                    : isInRange
                                      ? 'bg-sage-100 text-sage-500'
                                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                }`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-between mt-2 px-1">
                        <span className="text-[11px] text-stone-500">Struggling</span>
                        <span className="text-[11px] text-stone-500">Thriving</span>
                      </div>
                    </Card>
                  </div>
                );
              })()}

            {/* Step 9: Smart Journal Prompt */}
            {step === 9 &&
              (() => {
                const dimScores = ALL_DIMENSIONS.filter(
                  (dim) => scores[dim] !== undefined,
                ).map((dim) => ({ dimension: dim, score: scores[dim] }));
                const prompts = getSmartJournalPrompts(dimScores, 1);
                const prompt = prompts[0];

                return prompt ? (
                  <div className="space-y-6">
                    <SmartJournalPrompt
                      prompt={{
                        text: prompt.prompt,
                        dimension: prompt.dimension as string,
                        priority: 1,
                        type: 'dimension_low',
                      }}
                      onSelectPrompt={(text) => setReflection(text + '\n\n')}
                      onRequestNew={() => {}}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Card>
                      <h2 className="font-serif text-2xl text-stone-800 mb-2">Journal Prompt</h2>
                      <p className="text-sm text-stone-500">
                        No targeted prompt available &mdash; proceed to write your reflection
                        freely.
                      </p>
                    </Card>
                  </div>
                );
              })()}

            {/* Step 10: Reflection */}
            {step === 10 && (
              <div className="space-y-6">
                <Card>
                  <h2 className="font-serif text-2xl text-stone-800 mb-2">
                    Today&rsquo;s Reflection
                  </h2>
                  <p className="text-sm text-stone-500 mb-4">
                    What&rsquo;s on your mind? Any wins, challenges, or thoughts?
                  </p>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="h-40"
                    placeholder="Today I felt grateful for..."
                  />
                </Card>
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* COMPLETE (both modes)                                             */}
        {/* ================================================================= */}
        {step === completeStep && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage-100 to-sage-200 flex items-center justify-center mx-auto">
              <CheckCircle size={40} weight="regular" className="text-sage-500" />
            </div>
            <div>
              <h2 className="font-serif text-3xl text-stone-900 mb-2">Check-in Complete</h2>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">
                Beautiful. Your reflections are saved and your AI coach will generate new insights
                shortly.
              </p>
            </div>

            {/* Mini summary */}
            <Card className="max-w-sm mx-auto text-left">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-3 font-medium">
                Today&rsquo;s Snapshot
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_DIMENSIONS.filter((dim) => scores[dim] !== undefined).map((dim) => (
                  <div key={dim} className="flex items-center gap-2">
                    <div className="w-6 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage-300"
                        style={{ width: `${scores[dim] * 10}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-500">{DIMENSION_LABELS[dim]}</span>
                    <span className="text-[11px] font-mono text-sage-500 ml-auto">
                      {scores[dim]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sage-500 to-sage-600 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
            >
              View Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < completeStep && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 rounded-2xl"
            >
              <ArrowLeft size={16} weight="regular" />
              Back
            </Button>
          )}
          <Button
            variant={canProceed() ? 'primary' : 'secondary'}
            onClick={handleNext}
            disabled={!canProceed()}
            loading={submitting}
            className="flex-1 rounded-2xl"
          >
            {(isPredictiveMode
              ? getModeALogicalStep(step) === 'reflection'
              : step === 10)
              ? 'Complete Check-in'
              : 'Continue'}
          </Button>
        </div>
      )}

      {/* Badge Unlock Modal */}
      {earnedBadge && (
        <BadgeUnlockModal badge={earnedBadge} onClose={() => setEarnedBadge(null)} />
      )}
    </div>
  );
}
