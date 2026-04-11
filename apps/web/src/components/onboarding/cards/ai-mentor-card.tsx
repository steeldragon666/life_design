'use client';

import { useState, useEffect } from 'react';

interface AIMentorCardProps {
  onComplete: () => void;
}

export default function AIMentorCard({ onComplete }: AIMentorCardProps) {
  const [visibleBlocks, setVisibleBlocks] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleBlocks(1), 300),
      setTimeout(() => setVisibleBlocks(2), 800),
      setTimeout(() => setVisibleBlocks(3), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-10 text-center">
        {/* Life Orb visual */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#9BB89B] to-[#5A8F5A] opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#9BB89B] to-[#5A8F5A] opacity-30 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#B5D0B5] to-[#739A73] shadow-lg flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V6a4 4 0 0 1 4-4z" />
                <path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-3xl text-stone-900">Meet your AI companion</h2>
          <p className="text-stone-500 mt-3">Your personal guide that grows with you.</p>
        </div>

        <div className="space-y-4 text-left">
          <div
            className={`flex gap-4 p-4 bg-white rounded-xl border border-stone-100 transition-all duration-500 ${
              visibleBlocks >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">Personalized insights</h3>
              <p className="text-sm text-stone-600 mt-1">After a few check-ins, your AI will start spotting patterns — like how your sleep affects your productivity, or how socializing boosts your mood.</p>
            </div>
          </div>

          <div
            className={`flex gap-4 p-4 bg-white rounded-xl border border-stone-100 transition-all duration-500 ${
              visibleBlocks >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">Evolves with you</h3>
              <p className="text-sm text-stone-600 mt-1">Your companion adapts as your priorities change. It remembers your journey and calibrates its guidance to where you are now.</p>
            </div>
          </div>

          <div
            className={`flex gap-4 p-4 bg-white rounded-xl border border-stone-100 transition-all duration-500 ${
              visibleBlocks >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <h3 className="font-medium text-stone-900">Private & secure</h3>
              <p className="text-sm text-stone-600 mt-1">Your AI companion only knows what you share. All conversations are encrypted and never used for training.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className={`w-full py-4 rounded-2xl bg-gradient-to-r from-[#739A73] to-[#5A8F5A] text-white font-medium text-lg hover:opacity-90 transition-all duration-500 ${
            visibleBlocks >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Start my journey
        </button>
      </div>
    </div>
  );
}
