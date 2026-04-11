'use client';

import { useState } from 'react';
import DimensionImpactChart from './dimension-impact-chart';

interface PathwayBuilderProps {
  goalId: string;
  onGenerate: (goalId: string, userPlan: string) => Promise<{
    data: {
      pathway: unknown;
      risks: string[];
      suggestions: string[];
    } | null;
    error: string | null;
  }>;
}

export default function PathwayBuilder({ goalId, onGenerate }: PathwayBuilderProps) {
  const [userPlan, setUserPlan] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    risks: string[];
    suggestions: string[];
    dimensionImpacts: Array<{ dimension: string; impact: number; explanation: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!userPlan.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    const res = await onGenerate(goalId, userPlan);

    setGenerating(false);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      // Show risks and suggestions from the AI analysis
      setResult({
        risks: res.data.risks,
        suggestions: res.data.suggestions,
        dimensionImpacts: [],
      });
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold text-sm">Create a Pathway</h3>
      <p className="text-xs text-stone-500">
        Describe your rough plan for achieving this goal. AI will structure it into
        actionable steps and analyze how it impacts each life dimension.
      </p>

      <textarea
        value={userPlan}
        onChange={(e) => setUserPlan(e.target.value)}
        placeholder="e.g. I plan to study 30 minutes each morning, take a weekly conversation class, and find a language exchange partner..."
        className="w-full rounded-lg border p-3 text-sm"
        rows={4}
        aria-label="Pathway plan description"
      />

      <button
        onClick={handleGenerate}
        disabled={generating || !userPlan.trim()}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {generating ? 'Analyzing with AI...' : 'Analyze with AI'}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-lg bg-stone-50 p-3">
          <p className="text-xs font-medium text-sage-600">
            Pathway created and saved. See it below.
          </p>

          {result.risks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600">Risks</h4>
              <ul className="mt-1 space-y-0.5">
                {result.risks.map((r, i) => (
                  <li key={i} className="text-xs text-stone-600">- {r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-accent-600">Suggestions</h4>
              <ul className="mt-1 space-y-0.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-stone-600">- {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
