'use client';

export function ScreeningDisclaimer() {
  return (
    <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 text-sm text-stone-600">
      <p className="font-medium text-stone-700 mb-1">Important</p>
      <p>
        This is a validated screening tool, not a clinical diagnosis.
        Results should be discussed with a qualified healthcare professional.
        If you are in crisis, please contact Lifeline on{' '}
        <a href="tel:131114" className="font-semibold text-sage-700 underline">13 11 14</a>
        {' '}or call{' '}
        <a href="tel:000" className="font-semibold text-sage-700 underline">000</a>
        {' '}for emergencies.
      </p>
    </div>
  );
}
