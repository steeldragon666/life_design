'use client';

interface WelcomeCardProps {
  onNext: () => void;
}

export default function WelcomeCard({ onNext }: WelcomeCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Welcome to Opt In</h1>
          <p className="text-stone-500 text-lg">Your AI-powered personal analytics companion</p>
        </div>

        <div className="space-y-6 text-left">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
            <div>
              <h2 className="font-medium text-stone-900">How it works</h2>
              <p className="text-sm text-stone-600 mt-1">You check in daily across 8 life dimensions — career, finance, health, fitness, family, social, romance, and growth. Our AI finds patterns, correlations, and insights you'd never spot alone.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" /></svg>
            </div>
            <div>
              <h2 className="font-medium text-stone-900">AI that works for you</h2>
              <p className="text-sm text-stone-600 mt-1">We use AI to understand your life patterns and give you personalised guidance. It learns from your data to become more helpful over time — like a mentor that actually knows your story.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <h2 className="font-medium text-stone-900">Your data is yours</h2>
              <p className="text-sm text-stone-600 mt-1">We don't sell your data or use it to train our models. Every user's data is encrypted (AES-256) and only accessible when you're logged in. The more you share, the better we can help you.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
        >
          Let's get started
        </button>

        <p className="text-xs text-stone-400">
          <a href="/privacy" className="underline hover:text-stone-600">Privacy Policy</a>
          {' \u00b7 '}
          <a href="/terms" className="underline hover:text-stone-600">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
