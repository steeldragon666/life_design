import { useState } from 'react'

type Horizon = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'life'

const horizons: { id: Horizon; label: string }[] = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'yearly', label: 'This Year' },
  { id: 'life', label: 'Life Vision' },
]

const goalsData: Record<Horizon, { title: string; progress: number; category: string; status: 'active' | 'completed' | 'paused' }[]> = {
  daily: [
    { title: 'Morning meditation — 15 min', progress: 100, category: 'Spirituality', status: 'completed' },
    { title: 'Review weekly goals', progress: 0, category: 'Growth', status: 'active' },
    { title: 'Walk 8,000 steps', progress: 62, category: 'Health', status: 'active' },
    { title: 'Read 30 pages', progress: 0, category: 'Growth', status: 'active' },
  ],
  weekly: [
    { title: 'Complete meditation course module 4', progress: 65, category: 'Spirituality', status: 'active' },
    { title: 'Ship portfolio hero section', progress: 40, category: 'Career', status: 'active' },
    { title: 'Run 3 times', progress: 66, category: 'Health', status: 'active' },
    { title: 'Date night', progress: 0, category: 'Relationships', status: 'active' },
  ],
  monthly: [
    { title: 'Complete meditation course', progress: 65, category: 'Spirituality', status: 'active' },
    { title: 'Ship portfolio redesign', progress: 40, category: 'Career', status: 'active' },
    { title: 'Run 5km without stopping', progress: 80, category: 'Health', status: 'active' },
    { title: 'Finish "Atomic Habits"', progress: 70, category: 'Growth', status: 'active' },
    { title: 'Save $500 emergency fund', progress: 90, category: 'Finance', status: 'active' },
  ],
  yearly: [
    { title: 'Run a half marathon', progress: 35, category: 'Health', status: 'active' },
    { title: 'Get promoted to Senior', progress: 50, category: 'Career', status: 'active' },
    { title: 'Build side project to $1k MRR', progress: 15, category: 'Finance', status: 'active' },
    { title: 'Read 24 books', progress: 25, category: 'Growth', status: 'active' },
  ],
  life: [
    { title: 'Achieve financial independence', progress: 12, category: 'Finance', status: 'active' },
    { title: 'Build a loving family', progress: 30, category: 'Relationships', status: 'active' },
    { title: 'Create something that outlives me', progress: 8, category: 'Growth', status: 'active' },
    { title: 'Master inner peace', progress: 20, category: 'Spirituality', status: 'active' },
  ],
}

const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
  Health: { bg: '#F4F7F4', text: '#5A7F5A', bar: '#9BB89B' },
  Career: { bg: '#F0F6FA', text: '#5E9BC4', bar: '#85B8D8' },
  Relationships: { bg: '#FEF7F0', text: '#D4864A', bar: '#E8A46D' },
  Growth: { bg: '#F5F0FA', text: '#8B7BA8', bar: '#C4B8D8' },
  Spirituality: { bg: '#F0F6FA', text: '#5E9BC4', bar: '#85B8D8' },
  Finance: { bg: '#FEF7F0', text: '#B86E3A', bar: '#D4864A' },
  Creativity: { bg: '#F4F7F4', text: '#5A7F5A', bar: '#9BB89B' },
  Environment: { bg: '#F9F7F3', text: '#A89B7B', bar: '#C4B8A0' },
}

export function GoalsPage() {
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('weekly')
  const goals = goalsData[activeHorizon]

  const completedCount = goals.filter(g => g.status === 'completed').length
  const totalProgress = Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Goals</h1>
          <p className="text-sm text-[#A8A198] mt-1">Track your progress across every time horizon</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E8E4DD] text-sm font-medium text-[#5A7F5A] hover:bg-[#F4F7F4] transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Horizon Tabs */}
      <div className="flex gap-1 p-1 bg-[#F5F3EF] rounded-2xl mb-8 overflow-x-auto">
        {horizons.map(h => (
          <button
            key={h.id}
            onClick={() => setActiveHorizon(h.id)}
            className={`flex-1 min-w-[80px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${activeHorizon === h.id
                ? 'bg-white text-[#2A2623] shadow-sm'
                : 'text-[#A8A198] hover:text-[#7D756A]'
              }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#5A7F5A]">{totalProgress}%</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Overall Progress</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#2A2623]">{goals.length}</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Active Goals</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 text-center">
          <p className="text-2xl font-['Instrument_Serif'] text-[#D4864A]">{completedCount}</p>
          <p className="text-[10px] text-[#A8A198] uppercase tracking-wider mt-1">Completed</p>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal, i) => {
          const colors = categoryColors[goal.category] || categoryColors.Health
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl bg-white border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 transition-all group ${goal.status === 'completed' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <button className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${goal.status === 'completed' ? 'bg-[#9BB89B] border-[#9BB89B]' : 'border-[#D4CFC5] hover:border-[#9BB89B]'}`}>
                  {goal.status === 'completed' && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm font-medium ${goal.status === 'completed' ? 'line-through text-[#A8A198]' : 'text-[#2A2623]'}`}>
                      {goal.title}
                    </p>
                    <span className="text-xs font-['DM_Mono'] font-medium ml-3" style={{ color: colors.text }}>{goal.progress}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {goal.category}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 bg-[#F5F3EF] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${goal.progress}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}