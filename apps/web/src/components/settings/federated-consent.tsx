'use client';

import { useState } from 'react';
import { Shield, Users, BarChart3, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FederatedConsentProps {
  isOptedIn: boolean;
  privacyBudgetUsed: number;
  roundsParticipated: number;
  onOptIn: () => Promise<void>;
  onOptOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Privacy budget bar
// ---------------------------------------------------------------------------

function PrivacyBudgetBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const colorClass =
    clamped > 80
      ? 'bg-red-500'
      : clamped > 50
        ? 'bg-yellow-500'
        : 'bg-emerald-500';

  const label =
    clamped > 80
      ? 'Privacy budget nearly exhausted'
      : clamped > 50
        ? 'Privacy budget moderately used'
        : 'Privacy budget healthy';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">Privacy budget used</span>
        <span className="text-stone-500">{Math.round(clamped)}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 font-serif text-lg font-semibold text-stone-900">
          {title}
        </h3>
        <p className="mb-6 text-sm text-stone-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FederatedConsent({
  isOptedIn,
  privacyBudgetUsed,
  roundsParticipated,
  onOptIn,
  onOptOut,
}: FederatedConsentProps) {
  const [showConfirm, setShowConfirm] = useState<'opt-in' | 'opt-out' | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (showConfirm === 'opt-in') {
        await onOptIn();
      } else {
        await onOptOut();
      }
    } finally {
      setLoading(false);
      setShowConfirm(null);
    }
  };

  return (
    <section aria-labelledby="federated-consent-heading" className="space-y-6">
      {/* Heading */}
      <div>
        <h2
          id="federated-consent-heading"
          className="font-serif text-lg font-semibold text-stone-900"
        >
          Community learning
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Help improve wellbeing insights for everyone while keeping your data
          private.
        </p>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-stone-100 bg-white p-5">
        <h3 className="mb-3 font-serif text-base font-semibold text-stone-800">
          How federated learning works
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          Federated learning lets your device contribute to a shared wellbeing
          model without ever uploading your personal data. Instead of sending raw
          information to a server, your device trains a local model and shares
          only the resulting anonymous, encrypted updates.
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-stone-600">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Shield size={14} className="text-emerald-600" />
            </span>
            <span>
              <strong className="text-stone-700">Your data never leaves your device.</strong>{' '}
              All processing happens locally.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-stone-600">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Shield size={14} className="text-emerald-600" />
            </span>
            <span>
              <strong className="text-stone-700">
                Only anonymous, encrypted model updates are shared.
              </strong>{' '}
              No one can reconstruct your personal data from them.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-stone-600">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Shield size={14} className="text-emerald-600" />
            </span>
            <span>
              <strong className="text-stone-700">
                You can withdraw at any time.
              </strong>{' '}
              Your future data will no longer be included.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-stone-600">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Users size={14} className="text-emerald-600" />
            </span>
            <span>
              <strong className="text-stone-700">
                At least 10 participants needed
              </strong>{' '}
              before any insights are generated, ensuring individual
              contributions cannot be identified.
            </span>
          </li>
        </ul>
      </div>

      {/* Privacy budget */}
      <div className="rounded-xl border border-stone-100 bg-white p-5">
        <PrivacyBudgetBar percent={privacyBudgetUsed} />
      </div>

      {/* Participation stats */}
      <div className="rounded-xl border border-stone-100 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
            <BarChart3 size={16} className="text-stone-500" />
          </span>
          <div>
            <p className="text-sm font-medium text-stone-700">
              Rounds participated
            </p>
            <p className="text-2xl font-semibold text-stone-900">
              {roundsParticipated}
            </p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="rounded-xl border border-stone-100 bg-white p-5">
        {isOptedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">
                You are participating in the community model
              </span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowConfirm('opt-out')}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400/50 disabled:opacity-50"
              aria-label="Leave the community model"
            >
              Leave the community model
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-stone-300" />
              <span className="text-sm font-medium text-stone-500">
                You are not currently participating
              </span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowConfirm('opt-in')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              aria-label="Join the community model"
            >
              Join the community model
            </button>
          </div>
        )}
      </div>

      {/* Withdrawal notice (shown when opted in) */}
      {isOptedIn && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <AlertTriangle
            size={16}
            className="mt-0.5 flex-shrink-0 text-amber-500"
          />
          <p className="text-xs leading-relaxed text-amber-700">
            Previously shared model updates cannot be removed from the
            aggregate, but no future data will be shared if you choose to leave.
          </p>
        </div>
      )}

      {/* Confirmation dialogs */}
      {showConfirm === 'opt-in' && (
        <ConfirmDialog
          title="Join the community model?"
          message="Your device will begin contributing anonymous, encrypted model updates during federated learning rounds. Your personal data will never leave your device."
          confirmLabel="Yes, join"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(null)}
        />
      )}
      {showConfirm === 'opt-out' && (
        <ConfirmDialog
          title="Leave the community model?"
          message="Previously shared model updates cannot be removed from the aggregate, but no future data will be shared. You can rejoin at any time."
          confirmLabel="Yes, leave"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(null)}
        />
      )}
    </section>
  );
}
