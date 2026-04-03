'use client';

import Link from 'next/link';
import { Sun, Moon } from '@phosphor-icons/react';

const rituals = [
  {
    href: '/rituals/morning',
    label: 'Morning Ritual',
    description: 'Start your day with intention and clarity',
    icon: Sun,
    time: 'Best before 10am',
    gradient: 'from-warm-100 to-warm-50',
    iconColor: 'text-warm-500',
    iconBg: 'bg-warm-100',
  },
  {
    href: '/rituals/evening',
    label: 'Evening Ritual',
    description: 'Reflect on your day and wind down peacefully',
    icon: Moon,
    time: 'Best after 7pm',
    gradient: 'from-accent-100 to-accent-50',
    iconColor: 'text-accent-600',
    iconBg: 'bg-accent-100',
  },
];

export default function RitualsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 md:pt-10 pb-24">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-stone-800">Daily Rituals</h1>
        <p className="text-sm text-stone-500 mt-1">
          Guided routines to bookend your day with purpose.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {rituals.map((ritual) => (
          <Link
            key={ritual.href}
            href={ritual.href}
            className="group rounded-2xl border border-stone-200/60 bg-white p-6 transition-all hover:border-sage-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-11 w-11 rounded-xl ${ritual.iconBg} flex items-center justify-center`}>
                <ritual.icon size={22} weight="regular" className={ritual.iconColor} />
              </div>
              <h2 className="font-serif text-xl text-stone-800">{ritual.label}</h2>
            </div>
            <p className="text-sm text-stone-500">{ritual.description}</p>
            <p className="text-xs text-stone-400 mt-2">{ritual.time}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
