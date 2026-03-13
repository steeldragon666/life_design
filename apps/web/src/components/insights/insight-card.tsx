import { 
  TrendingUp, 
  Zap, 
  Lightbulb, 
  Activity, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

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

const TYPE_CONFIG = {
  trend: { icon: TrendingUp, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  correlation: { icon: Activity, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  suggestion: { icon: Lightbulb, color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5' },
  goal_progress: { icon: Zap, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  goal_risk: { icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5' },
};

export default function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.trend;
  const Icon = config.icon;

  return (
    <div className={`glass-card group flex flex-col gap-4 border-l-4 ${config.border} p-5 relative overflow-hidden transition-all duration-300`}>
      <div className={`absolute top-0 right-0 h-24 w-24 ${config.bg} blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-tight leading-tight">{insight.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {insight.type.replace('_', ' ')}
              </span>
              {insight.dimension && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">
                    {insight.dimension}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          aria-label="Dismiss insight"
          className="p-1 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <p className="text-sm text-slate-300 leading-relaxed font-medium">
        {insight.body}
      </p>
    </div>
  );
}
