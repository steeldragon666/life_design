'use client';

interface InsightInfo {
  id: string;
  type: 'trend' | 'correlation' | 'suggestion' | 'goal_progress' | 'goal_risk';
  title: string;
  body: string;
  dimension: string | null;
}

interface InsightCardProps {
  insight: InsightInfo;
  onDismiss: (id: string) => void;
}

// Zen-minimal palette: sage/warm/sky
const TYPE_CONFIG: Record<string, { icon: string; accent: string; bg: string; border: string }> = {
  goal_risk: {
    icon: '\u26A0',
    accent: 'text-[#D4864A]',
    bg: 'bg-[#D4864A]/8',
    border: 'border-[#D4864A]/30',
  },
  goal_progress: {
    icon: '\u2B06',
    accent: 'text-[#5A7F5A]',
    bg: 'bg-[#5A7F5A]/8',
    border: 'border-[#5A7F5A]/30',
  },
  correlation: {
    icon: '\u2194',
    accent: 'text-[#5B7E9D]',
    bg: 'bg-[#5B7E9D]/8',
    border: 'border-[#5B7E9D]/30',
  },
  trend: {
    icon: '\u2197',
    accent: 'text-[#5A7F5A]',
    bg: 'bg-[#5A7F5A]/8',
    border: 'border-[#5A7F5A]/30',
  },
  suggestion: {
    icon: '\u2728',
    accent: 'text-[#8B7EC8]',
    bg: 'bg-[#8B7EC8]/8',
    border: 'border-[#8B7EC8]/30',
  },
};

// Negative trend gets warm/terracotta styling
function getConfig(insight: InsightInfo) {
  const base = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.trend;
  if (insight.type === 'trend' && insight.body.includes('declining')) {
    return { ...base, accent: 'text-[#D4864A]', bg: 'bg-[#D4864A]/8', border: 'border-[#D4864A]/30' };
  }
  return base;
}

export default function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const config = getConfig(insight);

  return (
    <div
      className={`
        group rounded-2xl bg-white border ${config.border}
        p-4 relative overflow-hidden
        transition-all duration-300 hover:shadow-sm
        animate-[fadeIn_0.4s_ease-out]
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center text-base`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-[#2A2623] leading-tight">
                {insight.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#A8A198]">
                  {insight.type.replace('_', ' ')}
                </span>
                {insight.dimension && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-[#D4CFC5]" />
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${config.accent}`}>
                      {insight.dimension}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => onDismiss(insight.id)}
              aria-label="Dismiss insight"
              className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-[#C4C0B8] hover:text-[#7D756A] hover:bg-[#F5F3EF]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-sm text-[#7D756A] leading-relaxed">
            {insight.body}
          </p>
        </div>
      </div>
    </div>
  );
}
