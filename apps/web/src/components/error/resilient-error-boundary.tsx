'use client';

import React from 'react';
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface ResilientErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKeys?: unknown[];
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ResilientErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface GlassErrorFallbackCardProps {
  title?: string;
  description?: string;
  className?: string;
  onRetry?: () => void;
}

function haveResetKeysChanged(prevKeys: unknown[] = [], nextKeys: unknown[] = []): boolean {
  if (prevKeys.length !== nextKeys.length) return true;
  for (let i = 0; i < prevKeys.length; i += 1) {
    if (!Object.is(prevKeys[i], nextKeys[i])) return true;
  }
  return false;
}

export function GlassErrorFallbackCard({
  title = 'Something went wrong',
  description = 'This section ran into a problem. Please try again in a moment.',
  className,
  onRetry,
}: GlassErrorFallbackCardProps) {
  return (
    <div className={cn('glass-card p-6 flex flex-col items-center justify-center text-center', className)}>
      <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Warning size={24} className="text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-stone-400 max-w-sm mt-2">{description}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-3 py-2 text-sm text-white transition-colors"
        >
          <ArrowCounterClockwise size={16} />
          Try Again
        </button>
      ) : null}
    </div>
  );
}

export default class ResilientErrorBoundary extends React.Component<
  ResilientErrorBoundaryProps,
  ResilientErrorBoundaryState
> {
  state: ResilientErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ResilientErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    // Keep local logging for development diagnostics.
    console.error('ResilientErrorBoundary caught a rendering error', error, errorInfo);
  }

  componentDidUpdate(prevProps: ResilientErrorBoundaryProps): void {
    const prevKeys = prevProps.resetKeys ?? [];
    const nextKeys = this.props.resetKeys ?? [];
    if (this.state.hasError && haveResetKeysChanged(prevKeys, nextKeys)) {
      this.resetBoundary();
    }
  }

  private resetBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <GlassErrorFallbackCard onRetry={this.resetBoundary} />;
    }
    return this.props.children;
  }
}
