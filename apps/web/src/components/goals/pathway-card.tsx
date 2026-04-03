'use client';

import DimensionImpactChart from './dimension-impact-chart';

interface PathwayStep {
  id: string;
  title: string;
  description: string | null;
  position: number;
  completed: boolean;
}

interface PathwayCardProps {
  pathway: {
    id: string;
    title: string;
    description: string | null;
    ai_generated: boolean;
    dimension_impacts: Array<{ dimension: string; impact: number; explanation: string }>;
    pathway_steps: PathwayStep[];
  };
  onToggleStep?: (stepId: string) => void;
  onDelete?: (pathwayId: string) => void;
}

export default function PathwayCard({ pathway, onToggleStep, onDelete }: PathwayCardProps) {
  const totalSteps = pathway.pathway_steps.length;
  const completedSteps = pathway.pathway_steps.filter((s) => s.completed).length;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{pathway.title}</h3>
            {pathway.ai_generated && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">AI</span>
            )}
          </div>
          {pathway.description && (
            <p className="text-xs text-stone-500 mt-0.5">{pathway.description}</p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(pathway.id)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>

      {/* Steps checklist */}
      {totalSteps > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Steps</span>
            <span>{completedSteps}/{totalSteps}</span>
          </div>
          {pathway.pathway_steps.map((step) => (
            <label
              key={step.id}
              className="flex items-start gap-2 rounded border px-2.5 py-1.5 cursor-pointer hover:bg-stone-50 text-sm"
            >
              <input
                type="checkbox"
                checked={step.completed}
                onChange={() => onToggleStep?.(step.id)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-sage-600"
              />
              <div>
                <span className={step.completed ? 'line-through text-stone-400' : ''}>
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-xs text-stone-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Dimension impact chart */}
      {pathway.dimension_impacts && pathway.dimension_impacts.length > 0 && (
        <DimensionImpactChart impacts={pathway.dimension_impacts} />
      )}
    </div>
  );
}
