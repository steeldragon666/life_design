interface InsightInfo {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion';
  title: string;
  body: string;
  dimension: string | null;
}

interface InsightCardProps {
  insight: InsightInfo;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES = {
  trend: 'bg-blue-50 text-blue-700',
  correlation: 'bg-purple-50 text-purple-700',
  suggestion: 'bg-green-50 text-green-700',
};

export default function InsightCard({ insight, onDismiss }: InsightCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${TYPE_STYLES[insight.type]}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium capitalize">
            {insight.type}
          </span>
          {insight.dimension && (
            <span className="text-xs opacity-75 capitalize">{insight.dimension}</span>
          )}
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="text-xs opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
      <h3 className="font-semibold">{insight.title}</h3>
      <p className="mt-1 text-sm">{insight.body}</p>
    </div>
  );
}
