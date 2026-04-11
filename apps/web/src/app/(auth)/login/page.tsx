'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/lib/guest-context';
import { Leaf, Microphone, ArrowRight, Sparkle, Compass, Target } from '@phosphor-icons/react';

// ---------------------------------------------------------------------------
// Feature card data
// ---------------------------------------------------------------------------

const FEATURE_CARDS = [
  { icon: Microphone, title: 'Voice Agent', desc: 'Natural conversation', color: 'from-warm-300/15 to-warm-400/5', iconColor: 'text-warm-400' },
  { icon: Target, title: 'Goal Tracking', desc: 'Multi-horizon goals', color: 'from-sage-300/15 to-sage-400/5', iconColor: 'text-sage-500' },
  { icon: Compass, title: 'Daily Check-ins', desc: 'Track your progress', color: 'from-accent-400/15 to-accent-500/5', iconColor: 'text-accent-500' },
  { icon: Sparkle, title: 'AI Insights', desc: 'Personalized wisdom', color: 'from-dim-social/15 to-dim-social/5', iconColor: 'text-dim-social' },
];

const TRUST_BADGES = [
  { dot: 'bg-sage-300', label: 'Local Storage' },
  { dot: 'bg-accent-400', label: 'Privacy First' },
  { dot: 'bg-dim-social', label: 'AI Powered' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const { profile, clearGuestData } = useGuest();
  const [hasOnboardingProgress, setHasOnboardingProgress] = useState(false);

  useEffect(() => {
    if (profile?.onboarded) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  useEffect(() => {
    const savedFlow = localStorage.getItem('opt-in-onboarding-progress');
    const savedCheckpoint = localStorage.getItem('opt-in-onboarding-checkpoint');
    const savedSession = localStorage.getItem('opt-in-onboarding-session');
    setHasOnboardingProgress(Boolean(savedFlow || savedCheckpoint || savedSession));
  }, []);

  const startGuestMode = () => {
    router.push('/onboarding');
  };

  const restartOnboarding = () => {
    clearGuestData();
    localStorage.removeItem('opt-in-onboarding-progress');
    localStorage.removeItem('opt-in-onboarding-checkpoint');
    localStorage.removeItem('opt-in-onboarding-session');
    router.push('/onboarding');
  };

  const continueAsGuest = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-stone-50">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-sage-200/25 via-accent-400/15 to-transparent rounded-full blur-[100px] animate-breathe" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-tr from-warm-200/15 via-warm-100/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-gradient-to-br from-sage-100/20 to-transparent rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-sm">
            <Leaf size={20} weight="light" className="text-white" />
          </div>
          <span className="font-serif text-xl text-stone-800">Opt In</span>
        </Link>
      </header>

      {/* Main Content */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center max-w-6xl mx-auto px-6 lg:px-12 pt-8 lg:pt-16 pb-16">
        {/* Left Content */}
        <div className="flex-1 max-w-xl space-y-8 text-center lg:text-left">
          <div className="animate-fade-up stagger-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-50 border border-sage-200/30 mb-6">
              <div className="w-2 h-2 rounded-full bg-sage-300 animate-breathe" />
              <span className="text-xs font-medium text-sage-500 tracking-wide uppercase">Personal Intelligence</span>
            </div>
          </div>

          <h1 className="animate-fade-up stagger-2 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] text-stone-900 tracking-tight">
            Design a life<br />
            <span className="italic text-sage-500">worth living</span>
          </h1>

          <p className="animate-fade-up stagger-3 text-lg text-stone-500 leading-relaxed max-w-md mx-auto lg:mx-0">
            Discover hidden patterns across health, career, relationships and growth. AI-powered insights connecting all dimensions of your life.
          </p>

          {/* Primary CTA */}
          <div className="animate-fade-up stagger-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            {!profile?.onboarded ? (
              <button
                onClick={startGuestMode}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-sage-500 to-sage-600 text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-sage-500/20 hover:shadow-xl hover:shadow-sage-500/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Microphone size={18} weight="light" />
                {hasOnboardingProgress || profile ? 'Resume Your Journey' : 'Start Your Journey'}
                <ArrowRight size={16} weight="light" className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={continueAsGuest}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-sage-500 to-sage-600 text-white rounded-2xl text-[15px] font-medium shadow-lg shadow-sage-500/20 hover:shadow-xl hover:shadow-sage-500/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Sparkle size={18} weight="light" />
                Continue to Dashboard
                <ArrowRight size={16} weight="light" className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            <p className="text-[13px] text-stone-400 self-center">No account needed</p>
          </div>

          {/* Resume / restart options */}
          {!profile?.onboarded && (hasOnboardingProgress || profile) && (
            <div className="animate-fade-up stagger-5">
              <button
                onClick={restartOnboarding}
                className="text-[13px] text-stone-400 hover:text-stone-500 transition-colors"
              >
                Start over instead
              </button>
            </div>
          )}

          {profile && (
            <div>
              <button
                onClick={clearGuestData}
                className="text-[13px] text-stone-400 hover:text-stone-500 transition-colors"
              >
                Clear data and start fresh
              </button>
            </div>
          )}
        </div>

        {/* Right - Feature Cards */}
        <div className="flex-1 max-w-lg mt-16 lg:mt-0 lg:pl-16 w-full">
          <div className="relative">
            {/* Central orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-sage-100 via-sage-50 to-accent-400/30 opacity-60 blur-xl animate-breathe" />

            <div className="grid grid-cols-2 gap-4 relative z-10">
              {FEATURE_CARDS.map((item, i) => (
                <div
                  key={i}
                  className={`animate-fade-up stagger-${i + 2} group p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-stone-200/60 hover:border-sage-200/50 hover:shadow-lg hover:shadow-sage-300/5 transition-all duration-300 hover:-translate-y-1 cursor-default`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <item.icon size={20} weight="light" className={item.iconColor} />
                  </div>
                  <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>
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
              <span className="text-xs text-stone-400 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200/60 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Leaf size={16} weight="light" className="text-sage-300" />
            <span>Opt In</span>
          </div>
          <p>Crafted with care for meaningful living</p>
        </div>
      </footer>
    </div>
  );
}
