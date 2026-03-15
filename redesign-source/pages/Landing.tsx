import { type Page, LeafIcon, MicIcon, ArrowRightIcon, SparklesIcon, CompassIcon, WavesIcon } from '../App'

function TargetIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function LandingPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FAFAF8]">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#C4D5C4]/25 via-[#B5D4E8]/15 to-transparent rounded-full blur-[100px] animate-breathe" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-tr from-[#F5C9A3]/15 via-[#FCE8D5]/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-gradient-to-br from-[#E4ECE4]/20 to-transparent rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#739A73] flex items-center justify-center shadow-sm">
            <LeafIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Design</span>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-sm text-[#5A7F5A] font-medium hover:text-[#476447] transition-colors px-4 py-2 rounded-full border border-[#C4D5C4]/50 hover:bg-[#F4F7F4]"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center max-w-6xl mx-auto px-6 lg:px-12 pt-8 lg:pt-16 pb-16">
        {/* Left Content */}
        <div className="flex-1 max-w-xl space-y-8 text-center lg:text-left">
          <div className="animate-fade-up stagger-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4F7F4] border border-[#C4D5C4]/30 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#9BB89B] animate-breathe" />
              <span className="text-xs font-medium text-[#5A7F5A] tracking-wide uppercase">Personal Intelligence</span>
            </div>
          </div>

          <h1 className="animate-fade-up stagger-2 font-['Instrument_Serif'] text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] text-[#1A1816] tracking-tight">
            Design a life<br />
            <span className="italic text-[#5A7F5A]">worth living</span>
          </h1>

          <p className="animate-fade-up stagger-3 text-lg text-[#7D756A] leading-relaxed max-w-md mx-auto lg:mx-0">
            Discover hidden patterns across health, career, relationships and growth. AI-powered insights connecting all dimensions of your life.
          </p>

          <div className="animate-fade-up stagger-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <button
              onClick={() => onNavigate('dashboard')}
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-[#5A7F5A]/20 hover:shadow-xl hover:shadow-[#5A7F5A]/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              <MicIcon className="w-[18px] h-[18px]" />
              Start Your Journey
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[13px] text-[#A8A198] self-center">No account needed</p>
          </div>
        </div>

        {/* Right - Feature Cards */}
        <div className="flex-1 max-w-lg mt-16 lg:mt-0 lg:pl-16 w-full">
          <div className="relative">
            {/* Central orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-[#E4ECE4] via-[#F4F7F4] to-[#DBEAF4] opacity-60 blur-xl animate-breathe" />

            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { icon: MicIcon, title: 'Voice Agent', desc: 'Natural conversation', color: 'from-[#E8A46D]/15 to-[#D4864A]/5', iconColor: 'text-[#D4864A]', delay: 'stagger-2' },
                { icon: TargetIcon2, title: 'Goal Tracking', desc: 'Multi-horizon goals', color: 'from-[#9BB89B]/15 to-[#739A73]/5', iconColor: 'text-[#5A7F5A]', delay: 'stagger-3' },
                { icon: CompassIcon, title: 'Daily Check-ins', desc: 'Track your progress', color: 'from-[#85B8D8]/15 to-[#5E9BC4]/5', iconColor: 'text-[#5E9BC4]', delay: 'stagger-4' },
                { icon: SparklesIcon, title: 'AI Insights', desc: 'Personalized wisdom', color: 'from-[#C4B8D8]/15 to-[#9B8BB8]/5', iconColor: 'text-[#8B7BA8]', delay: 'stagger-5' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`animate-fade-up ${item.delay} group p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 hover:shadow-lg hover:shadow-[#9BB89B]/5 transition-all duration-300 hover:-translate-y-1 cursor-default`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold text-[#2A2623]">{item.title}</p>
                  <p className="text-xs text-[#A8A198] mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pb-16">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {[
            { dot: 'bg-[#9BB89B]', label: 'Local Storage' },
            { dot: 'bg-[#85B8D8]', label: 'Privacy First' },
            { dot: 'bg-[#C4B8D8]', label: 'AI Powered' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.dot}`} />
              <span className="text-xs text-[#A8A198] font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 py-20 border-t border-[#E8E4DD]/60">
        <h2 className="font-['Instrument_Serif'] text-3xl text-center text-[#1A1816] mb-4">How it works</h2>
        <p className="text-center text-[#A8A198] mb-16 max-w-md mx-auto">Three simple steps to begin your journey of intentional living</p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Speak your mind', desc: 'Start a voice conversation. Share your goals, challenges, and aspirations naturally.', icon: MicIcon },
            { step: '02', title: 'Discover patterns', desc: 'AI connects the dots across all eight dimensions of your life.', icon: WavesIcon },
            { step: '03', title: 'Grow intentionally', desc: 'Receive personalized insights and track your progress over time.', icon: LeafIcon },
          ].map((item, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-[#F4F7F4] border border-[#C4D5C4]/30 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#E4ECE4] transition-colors">
                <item.icon className="w-6 h-6 text-[#5A7F5A]" />
              </div>
              <p className="text-xs text-[#A8A198] font-['DM_Mono'] mb-2">{item.step}</p>
              <h3 className="font-['Instrument_Serif'] text-xl text-[#2A2623] mb-2">{item.title}</h3>
              <p className="text-sm text-[#7D756A] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-[#F4F7F4] via-[#FAFAF8] to-[#FEF7F0] border border-[#E8E4DD]/60 p-12 text-center">
          <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-4">Begin with intention</h2>
          <p className="text-[#7D756A] mb-8 max-w-md mx-auto">No signup required. Start with a simple conversation and let your journey unfold naturally.</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-[#5A7F5A]/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            Start Your Journey
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E8E4DD]/60 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#A8A198]">
          <div className="flex items-center gap-2">
            <LeafIcon className="w-4 h-4 text-[#9BB89B]" />
            <span>Life Design</span>
          </div>
          <p>Crafted with care for meaningful living</p>
        </div>
      </footer>
    </div>
  )
}
