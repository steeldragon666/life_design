'use client';

import { CheckCircle, Sun, Lock, Shield } from 'lucide-react';

interface WelcomeCardProps {
  onNext: () => void;
}

export default function WelcomeCard({ onNext }: WelcomeCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-lg">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Welcome to Opt In</h1>
          <p className="text-stone-500 text-lg">Your AI-powered personal analytics companion</p>
        </div>

        <div className="space-y-6 text-left">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-1">
              <Sun size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-medium text-stone-900">How it works</h2>
              <p className="text-sm text-stone-600 mt-1">You check in daily across 8 life dimensions — career, finance, health, fitness, family, social, romance, and growth. Our AI finds patterns, correlations, and insights you'd never spot alone.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 mt-1">
              <Lock size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-medium text-stone-900">AI that works for you</h2>
              <p className="text-sm text-stone-600 mt-1">We use AI to understand your life patterns and give you personalised guidance. It learns from your data to become more helpful over time — like a mentor that actually knows your story.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-1">
              <Shield size={20} className="text-emerald-600" />
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
