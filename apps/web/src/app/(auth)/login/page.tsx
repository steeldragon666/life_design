'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Zap, Compass, Mic, Target, Waves } from 'lucide-react';
import { useGuest } from '@/lib/guest-context';

export default function LoginPage() {
  const router = useRouter();
  const { profile, clearGuestData } = useGuest();

  useEffect(() => {
    if (profile?.onboarded) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  const startGuestMode = () => {
    clearGuestData();
    router.push('/onboarding');
  };

  const continueAsGuest = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0e17] flex">
      {/* Organic Flowing Background - Calming Aesthetic */}
      <div className="absolute inset-0">
        {/* Soft gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f1729] to-[#0a0e17]" />
        
        {/* Organic flowing shapes */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-teal-500/10 via-blue-500/5 to-transparent rounded-full blur-[100px] animate-pulse-subtle" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-tr from-purple-500/8 via-pink-500/5 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full blur-[80px]" />
        </div>

        {/* Subtle organic wave pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="w-full flex flex-col lg:flex-row items-stretch relative z-10">
        {/* Left Side - Hero Illustration */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
          <div className="relative w-full max-w-lg">
            {/* Glow effect behind illustration */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-blue-500/10 to-purple-500/20 blur-[60px] rounded-full" />
            
            <Image
              src="/images/life-design-hero-illustration.png"
              alt="Life Design"
              width={500}
              height={500}
              className="relative z-10 object-contain drop-shadow-2xl"
              priority
            />

            {/* Floating elements */}
            <div className="absolute top-10 right-10 glass rounded-2xl p-3 animate-float" style={{ animationDelay: '0s' }}>
              <Target className="h-6 w-6 text-teal-400" />
            </div>
            <div className="absolute bottom-20 left-0 glass rounded-2xl p-3 animate-float" style={{ animationDelay: '1s' }}>
              <Waves className="h-6 w-6 text-blue-400" />
            </div>
            <div className="absolute top-1/3 left-10 glass rounded-2xl p-3 animate-float" style={{ animationDelay: '2s' }}>
              <Compass className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Brand */}
            <div className="text-center lg:text-left space-y-4">
              <div className="flex justify-center lg:justify-start">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-400/20 via-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-2xl shadow-teal-500/10 backdrop-blur-xl">
                  <Image
                    src="/images/life-orb-3d-icon.png"
                    alt="Life Design"
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-[34px] font-bold tracking-tight text-white leading-tight">
                  Life Design
                </h1>
                <p className="text-[17px] text-slate-400 mt-2 font-medium leading-relaxed">
                  Your personal intelligence platform for meaningful living
                </p>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="space-y-4">
              {!profile?.onboarded ? (
                <button
                  onClick={startGuestMode}
                  className="group flex w-full items-center justify-center gap-3 btn-coral py-5 text-[17px]"
                >
                  <Mic className="h-5 w-5" />
                  Start Your Journey
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={continueAsGuest}
                  className="group flex w-full items-center justify-center gap-3 btn-primary py-5 text-[17px]"
                >
                  <Sparkles className="h-5 w-5" />
                  Continue to Dashboard
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <p className="text-center text-[13px] text-slate-500">
                No account needed. Start with a voice conversation.
              </p>
            </div>

            {/* Feature Cards - iOS Style */}
            <div className="grid grid-cols-2 gap-3">
              <FeatureCard
                icon={Mic}
                title="AI Voice Agent"
                description="Natural conversation"
                color="coral"
              />
              <FeatureCard
                icon={Target}
                title="Goal Tracking"
                description="Multi-horizon goals"
                color="teal"
              />
              <FeatureCard
                icon={Compass}
                title="Daily Check-ins"
                description="Track your progress"
                color="blue"
              />
              <FeatureCard
                icon={Sparkles}
                title="AI Insights"
                description="Personalized wisdom"
                color="purple"
              />
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs">Local Storage</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs">Privacy First</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-xs">AI Powered</span>
              </div>
            </div>

            {/* Footer */}
            {profile && (
              <div className="text-center pt-4">
                <button
                  onClick={clearGuestData}
                  className="text-[13px] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear data and start fresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  color 
}: { 
  icon: any; 
  title: string; 
  description: string;
  color: 'coral' | 'teal' | 'blue' | 'purple';
}) {
  const colors = {
    coral: 'from-coral-400/20 to-coral-500/10 text-coral-400',
    teal: 'from-teal-400/20 to-teal-500/10 text-teal-400',
    blue: 'from-blue-400/20 to-blue-500/10 text-blue-400',
    purple: 'from-purple-400/20 to-purple-500/10 text-purple-400',
  };

  return (
    <div className="glass-card p-4 flex flex-col items-center text-center gap-2 hover:bg-white/8 transition-all group">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
