import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHaptics } from './use-haptics';

const mockVibrate = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, 'vibrate', {
    value: mockVibrate,
    writable: true,
    configurable: true,
  });
  mockVibrate.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useHaptics', () => {
  it('calls navigator.vibrate with the pattern', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.vibrate(100);
    });

    expect(mockVibrate).toHaveBeenCalledWith(100);
  });

  it('calls navigator.vibrate with an array pattern', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.vibrate([100, 50, 200]);
    });

    expect(mockVibrate).toHaveBeenCalledWith([100, 50, 200]);
  });

  it('does not throw when navigator.vibrate is unavailable', () => {
    // Remove vibrate from navigator to simulate unsupported browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).vibrate;

    const { result } = renderHook(() => useHaptics());

    expect(() => {
      act(() => {
        result.current.vibrate(100);
      });
    }).not.toThrow();
  });
});
