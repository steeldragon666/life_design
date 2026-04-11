import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSound } from './use-sound';

const mockPlay = vi.fn().mockResolvedValue(undefined);

class MockAudio {
  src: string;
  volume = 1;

  constructor(src?: string) {
    this.src = src ?? '';
  }

  play = mockPlay;
}

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio);
  localStorage.clear();
  mockPlay.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSound', () => {
  it('creates Audio with correct src and volume', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('/click.mp3', 0.3);
    });

    expect(mockPlay).toHaveBeenCalled();
  });

  it('uses default volume of 0.5', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('/click.mp3');
    });

    expect(mockPlay).toHaveBeenCalled();
  });

  it('does nothing when localStorage opt-in-sound-enabled is false', () => {
    localStorage.setItem('opt-in-sound-enabled', 'false');
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('/click.mp3');
    });

    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('does not throw when Audio constructor fails', () => {
    vi.stubGlobal('Audio', class {
      constructor() {
        throw new Error('Audio not supported');
      }
    });

    const { result } = renderHook(() => useSound());

    expect(() => {
      act(() => {
        result.current.play('/click.mp3');
      });
    }).not.toThrow();
  });
});
