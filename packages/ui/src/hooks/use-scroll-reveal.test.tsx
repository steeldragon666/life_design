import { render, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollReveal } from './use-scroll-reveal';

let observeCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(
        callback: IntersectionObserverCallback,
        _options?: IntersectionObserverInit,
      ) {
        observeCallback = callback as unknown as typeof observeCallback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
      takeRecords = vi.fn().mockReturnValue([]);
      root = null;
      rootMargin = '';
      thresholds = [];
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Test component that uses the hook and exposes visibility via data attribute
function TestComponent() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return <div ref={ref} data-testid="target" data-visible={String(isVisible)} />;
}

describe('useScrollReveal', () => {
  it('starts with isVisible = false', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('target').dataset.visible).toBe('false');
  });

  it('observes the element on mount', () => {
    render(<TestComponent />);
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('sets isVisible to true when element intersects', () => {
    const { getByTestId } = render(<TestComponent />);

    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });

    expect(getByTestId('target').dataset.visible).toBe('true');
  });

  it('unobserves the element after intersection (one-shot)', () => {
    render(<TestComponent />);

    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });

    expect(mockUnobserve).toHaveBeenCalledTimes(1);
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<TestComponent />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
