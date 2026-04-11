'use client';

import type { BadgeDefinition } from '@/lib/achievements/badge-definitions';
import { Button, Confetti } from '@life-design/ui';

interface BadgeUnlockModalProps {
  badge: BadgeDefinition;
  onClose: () => void;
}

export default function BadgeUnlockModal({ badge, onClose }: BadgeUnlockModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Confetti colors={['#5A7F5A', '#D4864A', '#5E9BC4']} particleCount={40} />
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-xl animate-fade-up">
        <div className="text-5xl mb-4">{badge.emoji}</div>
        <h2 className="font-heading text-xl text-stone-800 mb-2">Badge Unlocked!</h2>
        <h3 className="font-heading text-lg text-stone-700 mb-1">{badge.name}</h3>
        <p className="text-sm text-stone-500 mb-6">{badge.description}</p>
        <Button variant="primary" onClick={onClose}>
          Continue
        </Button>
      </div>
    </div>
  );
}
