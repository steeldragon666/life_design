'use client';

interface ConsentCardProps {
  onConsent: () => void;
  onSkip: () => void;
}

export function ConsentCard({ onConsent, onSkip }: ConsentCardProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">
        Optional: Mental Health Baseline
      </h2>
      <p className="text-sm text-stone-600">
        We&apos;d like to ask you a few validated questions about your mood and
        anxiety levels. This helps us personalise your experience and track your
        progress over time.
      </p>
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm text-stone-600">
        <p className="font-medium text-stone-700 mb-1">What to know:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>These are standardised screening tools (PHQ-9 and GAD-7)</li>
          <li>They are not a clinical diagnosis</li>
          <li>Your responses are private and encrypted</li>
          <li>You can skip this and take them later in Settings</li>
        </ul>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConsent}
          className="flex-1 rounded-lg bg-sage-600 text-white py-2 font-medium"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="flex-1 rounded-lg border border-stone-300 text-stone-600 py-2 font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
