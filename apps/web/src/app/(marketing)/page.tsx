import type { Metadata } from 'next';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Life Design — Your entire life, intelligently connected',
  description:
    'Discover hidden patterns across health, career, relationships and growth. AI-powered insights connecting all dimensions of your life.',
  alternates: { canonical: '/' },
};

// ---------------------------------------------------------------------------
// Inline SVG icons (matching redesign stroke style)
// ---------------------------------------------------------------------------

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 17 3.5s4 2 4 9-5.5 8-5.5 8" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z" />
    </svg>
  );
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-1.804 5.411a2 2 0 01-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 011.265-1.265z" />
    </svg>
  );
}

function WavesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const FEATURE_CARDS = [
  { icon: MicIcon, title: 'Voice Agent', desc: 'Natural conversation', color: 'from-[#E8A46D]/15 to-[#D4864A]/5', iconColor: 'text-[#D4864A]' },
  { icon: TargetIcon, title: 'Goal Tracking', desc: 'Multi-horizon goals', color: 'from-[#9BB89B]/15 to-[#739A73]/5', iconColor: 'text-[#5A7F5A]' },
  { icon: CompassIcon, title: 'Daily Check-ins', desc: 'Track your progress', color: 'from-[#85B8D8]/15 to-[#5E9BC4]/5', iconColor: 'text-[#5E9BC4]' },
  { icon: SparklesIcon, title: 'AI Insights', desc: 'Personalized wisdom', color: 'from-[#C4B8D8]/15 to-[#9B8BB8]/5', iconColor: 'text-[#8B7BA8]' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Speak your mind', desc: 'Start a voice conversation. Share your goals, challenges, and aspirations naturally.', icon: MicIcon },
  { step: '02', title: 'Discover patterns', desc: 'AI connects the dots across all eight dimensions of your life.', icon: WavesIcon },
  { step: '03', title: 'Grow intentionally', desc: 'Receive personalized insights and track your progress over time.', icon: LeafIcon },
];

const TRUST_BADGES = [
  { dot: 'bg-[#9BB89B]', label: 'Local Storage' },
  { dot: 'bg-[#85B8D8]', label: 'Privacy First' },
  { dot: 'bg-[#C4B8D8]', label: 'AI Powered' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketingLandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#FAFAF8]">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
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
        <Link
          href="/login"
          className="text-sm text-[#5A7F5A] font-medium hover:text-[#476447] transition-colors px-4 py-2 rounded-full border border-[#C4D5C4]/50 hover:bg-[#F4F7F4]"
        >
          Sign in
        </Link>
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
            <Link
              href="/login"
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-[#5A7F5A]/20 hover:shadow-xl hover:shadow-[#5A7F5A]/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              <MicIcon className="w-[18px] h-[18px]" />
              Start Your Journey
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-[13px] text-[#A8A198] self-center">No account needed</p>
          </div>
        </div>

        {/* Right - Feature Cards */}
        <div className="flex-1 max-w-lg mt-16 lg:mt-0 lg:pl-16 w-full">
          <div className="relative">
            {/* Central orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-[#E4ECE4] via-[#F4F7F4] to-[#DBEAF4] opacity-60 blur-xl animate-breathe" />

            <div className="grid grid-cols-2 gap-4 relative z-10">
              {FEATURE_CARDS.map((item, i) => (
                <div
                  key={i}
                  className={`animate-fade-up stagger-${i + 2} group p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#E8E4DD]/60 hover:border-[#C4D5C4]/50 hover:shadow-lg hover:shadow-[#9BB89B]/5 transition-all duration-300 hover:-translate-y-1 cursor-default`}
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
          {TRUST_BADGES.map((item, i) => (
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
          {HOW_IT_WORKS.map((item, i) => (
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
          <Link
            href="/login"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-[#5A7F5A]/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            Start Your Journey
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
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
    </main>
  );
}
