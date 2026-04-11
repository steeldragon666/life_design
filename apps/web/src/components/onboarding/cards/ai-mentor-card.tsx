'use client';

import { useState, useEffect } from 'react';
import { User, Activity, Sun, Shield } from 'lucide-react';

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
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sage-300 to-sage-500 opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-sage-300 to-sage-500 opacity-30 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sage-200 to-sage-400 shadow-lg flex items-center justify-center">
              <User size={40} className="text-white" strokeWidth={1.5} />
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
              <Activity size={20} className="text-blue-600" />
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
              <Sun size={20} className="text-purple-600" />
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
              <Shield size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-stone-900">Private & secure</h3>
              <p className="text-sm text-stone-600 mt-1">Your AI companion only knows what you share. All conversations are encrypted and never used for training.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className={`w-full py-4 rounded-2xl bg-gradient-to-r from-sage-400 to-sage-500 text-white font-medium text-lg hover:opacity-90 transition-all duration-500 ${
            visibleBlocks >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Start my journey
        </button>
      </div>
    </div>
  );
}
