import { useState } from 'react'

const dimensions = [
  { name: 'Health', emoji: '🌿', question: 'How is your physical wellbeing today?' },
  { name: 'Career', emoji: '🎯', question: 'How fulfilled do you feel at work?' },
  { name: 'Relationships', emoji: '🤝', question: 'How connected do you feel to others?' },
  { name: 'Growth', emoji: '📖', question: 'How much did you learn today?' },
  { name: 'Finance', emoji: '✨', question: 'How secure do you feel financially?' },
  { name: 'Creativity', emoji: '🎨', question: 'How inspired are you feeling?' },
  { name: 'Spirituality', emoji: '🧘', question: 'How at peace do you feel?' },
  { name: 'Environment', emoji: '🏡', question: 'How comfortable is your environment?' },
]

const moodOptions = [
  { value: 1, label: 'Struggling', color: '#D4864A' },
  { value: 2, label: 'Low', color: '#E8A46D' },
  { value: 3, label: 'Neutral', color: '#A8A198' },
  { value: 4, label: 'Good', color: '#9BB89B' },
  { value: 5, label: 'Thriving', color: '#5A7F5A' },
]

export function CheckInPage() {
  const [step, setStep] = useState(0) // 0 = mood, 1-8 = dimensions, 9 = reflection, 10 = complete
  const [mood, setMood] = useState<number | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [reflection, setReflection] = useState('')

  const totalSteps = 10
  const progress = ((step + 1) / (totalSteps + 1)) * 100

  const handleDimensionScore = (name: string, score: number) => {
    setScores(prev => ({ ...prev, [name]: score }))
  }

  const canProceed = () => {
    if (step === 0) return mood !== null
    if (step >= 1 && step <= 8) return scores[dimensions[step - 1].name] !== undefined
    if (step === 9) return true
    return false
  }

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Daily Check-in</h1>
        <p className="text-sm text-[#A8A198] mt-1">Take a moment to reflect on your day</p>
      </div>

      {/* Progress Bar */}
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

      {/* Step Content */}
      <div className="animate-fade-up" key={step}>
        {step === 0 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
              <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623] mb-2">How are you feeling overall?</h2>
              <p className="text-sm text-[#A8A198] mb-6">Be honest — there's no wrong answer</p>

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
            </div>
          </div>
        )}

        {step >= 1 && step <= 8 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{dimensions[step - 1].emoji}</span>
                <div>
                  <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623]">{dimensions[step - 1].name}</h2>
                  <p className="text-sm text-[#A8A198]">{dimensions[step - 1].question}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                  const isSelected = scores[dimensions[step - 1].name] === score
                  const isInRange = scores[dimensions[step - 1].name] !== undefined && score <= scores[dimensions[step - 1].name]
                  return (
                    <button
                      key={score}
                      onClick={() => handleDimensionScore(dimensions[step - 1].name, score)}
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
                  )
                })}
              </div>

              <div className="flex justify-between mt-2 px-1">
                <span className="text-[10px] text-[#A8A198]">Struggling</span>
                <span className="text-[10px] text-[#A8A198]">Thriving</span>
              </div>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60">
              <h2 className="font-['Instrument_Serif'] text-2xl text-[#2A2623] mb-2">Today's Reflection</h2>
              <p className="text-sm text-[#A8A198] mb-4">What's on your mind? Any wins, challenges, or thoughts?</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full h-40 p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E4DD] text-sm text-[#3D3833] resize-none focus:outline-none focus:ring-2 focus:ring-[#9BB89B]/50 focus:border-[#9BB89B] placeholder:text-[#C4C0B8]"
                placeholder="Today I felt grateful for..."
              />
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E4ECE4] to-[#C4D5C4] flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-10 h-10 text-[#5A7F5A]" />
            </div>
            <div>
              <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">Check-in Complete</h2>
              <p className="text-sm text-[#A8A198] max-w-sm mx-auto">Beautiful. Your reflections are saved and your AI coach will generate new insights shortly.</p>
            </div>

            {/* Mini summary */}
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60 max-w-sm mx-auto text-left">
              <p className="text-xs text-[#A8A198] uppercase tracking-wider mb-3 font-medium">Today's Snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(scores).map(([name, score]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-6 h-1.5 rounded-full bg-[#F5F3EF] overflow-hidden">
                      <div className="h-full rounded-full bg-[#9BB89B]" style={{ width: `${score * 10}%` }} />
                    </div>
                    <span className="text-[11px] text-[#7D756A]">{name}</span>
                    <span className="text-[10px] font-['DM_Mono'] text-[#5A7F5A] ml-auto">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < 10 && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-2xl border border-[#E8E4DD] text-sm font-medium text-[#7D756A] hover:bg-[#F5F3EF] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className={`flex-1 px-6 py-3 rounded-2xl text-sm font-medium transition-all
              ${canProceed()
                ? 'bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white shadow-sm hover:shadow-md'
                : 'bg-[#F5F3EF] text-[#C4C0B8] cursor-not-allowed'
              }`}
          >
            {step === 9 ? 'Complete Check-in' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
