import { useState } from 'react'
import type { Page } from '../App'
import { SparklesIcon, MicIcon } from '../App'

export function DashboardPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [greeting] = useState(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })

  const dimensions = [
    { name: 'Health', score: 78, color: '#9BB89B', bg: '#F4F7F4' },
    { name: 'Career', score: 65, color: '#5E9BC4', bg: '#F0F6FA' },
    { name: 'Relationships', score: 82, color: '#E8A46D', bg: '#FEF7F0' },
    { name: 'Growth', score: 71, color: '#8B7BA8', bg: '#F5F0FA' },
    { name: 'Finance', score: 60, color: '#D4864A', bg: '#FEF7F0' },
    { name: 'Creativity', score: 45, color: '#5A7F5A', bg: '#F4F7F4' },
    { name: 'Spirituality', score: 88, color: '#85B8D8', bg: '#F0F6FA' },
    { name: 'Environment', score: 73, color: '#A89B7B', bg: '#F9F7F3' },
  ]

  const recentInsights = [
    { text: 'Your sleep patterns show a strong correlation with creative output. Consider maintaining your 10pm bedtime.', time: '2h ago', tag: 'Health × Creativity' },
    { text: 'You\'ve completed 4 consecutive daily check-ins — consistency is building momentum.', time: '5h ago', tag: 'Growth' },
    { text: 'Your relationship satisfaction peaks when you have 2+ social activities per week.', time: '1d ago', tag: 'Relationships' },
  ]

  const upcomingGoals = [
    { title: 'Complete meditation course', progress: 65, due: 'Mar 22', category: 'Spirituality' },
    { title: 'Ship portfolio redesign', progress: 40, due: 'Apr 1', category: 'Career' },
    { title: 'Run 5km without stopping', progress: 80, due: 'Mar 30', category: 'Health' },
  ]

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">{greeting}, Aaron</h1>
          <p className="text-sm text-[#A8A198] mt-1">Saturday, March 15 — Here's your life at a glance</p>
        </div>
        <button className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white text-sm font-medium shadow-sm hover:shadow-md transition-all">
          <MicIcon className="w-4 h-4" />
          Voice Check-in
        </button>
      </div>

      {/* Life Score Overview */}
      <div className="mb-8 p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Balance</h2>
            <p className="text-xs text-[#A8A198] mt-0.5">Across 8 dimensions</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-['Instrument_Serif'] text-[#5A7F5A]">72</p>
            <p className="text-[10px] text-[#A8A198] uppercase tracking-wider">Overall</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {dimensions.map((dim) => (
            <div key={dim.name} className="group p-3 rounded-xl hover:shadow-sm transition-all cursor-default" style={{ backgroundColor: dim.bg }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#5C554C]">{dim.name}</span>
                <span className="text-xs font-['DM_Mono'] font-medium" style={{ color: dim.color }}>{dim.score}</span>
              </div>
              <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${dim.score}%`, backgroundColor: dim.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-4 h-4 text-[#8B7BA8]" />
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">AI Insights</h2>
          </div>

          <div className="space-y-3">
            {recentInsights.map((insight, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4F7F4] to-[#E4ECE4] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <SparklesIcon className="w-4 h-4 text-[#5A7F5A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#3D3833] leading-relaxed">{insight.text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F4] text-[#5A7F5A] font-medium">{insight.tag}</span>
                      <span className="text-[10px] text-[#A8A198]">{insight.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Goals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Active Goals</h2>
            <button onClick={() => onNavigate('goals')} className="text-xs text-[#5A7F5A] font-medium hover:underline">View all</button>
          </div>

          <div className="space-y-3">
            {upcomingGoals.map((goal, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-[#2A2623]">{goal.title}</p>
                    <p className="text-[10px] text-[#A8A198] mt-0.5">{goal.category} · Due {goal.due}</p>
                  </div>
                  <span className="text-xs font-['DM_Mono'] font-medium text-[#5A7F5A]">{goal.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#F5F3EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#9BB89B] to-[#5A7F5A] rounded-full transition-all duration-700"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F4F7F4] to-[#E4ECE4] border border-[#C4D5C4]/20">
            <p className="text-xs font-medium text-[#5A7F5A] mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('checkin')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FEF7F0] flex items-center justify-center">
                  <SunSmallIcon className="w-3.5 h-3.5 text-[#D4864A]" />
                </div>
                Daily Check-in
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-[#F0F6FA] flex items-center justify-center">
                  <PenIcon className="w-3.5 h-3.5 text-[#5E9BC4]" />
                </div>
                Journal Entry
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white text-sm text-[#3D3833] transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-[#F5F0FA] flex items-center justify-center">
                  <MicIcon className="w-3.5 h-3.5 text-[#8B7BA8]" />
                </div>
                Voice Reflection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly rhythm */}
      <div className="mt-8 p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
        <h2 className="font-['Instrument_Serif'] text-xl text-[#2A2623] mb-4">This Week's Rhythm</h2>
        <div className="flex items-end gap-2 h-32">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const heights = [60, 80, 45, 90, 70, 85, 30]
            const isToday = i === 5
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-lg transition-all ${isToday ? 'bg-gradient-to-t from-[#5A7F5A] to-[#9BB89B]' : 'bg-[#E4ECE4]'}`}
                    style={{ height: `${heights[i]}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isToday ? 'text-[#5A7F5A]' : 'text-[#A8A198]'}`}>{day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SunSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  )
}