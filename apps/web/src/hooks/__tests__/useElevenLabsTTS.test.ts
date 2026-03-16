import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useElevenLabsTTS } from '../useElevenLabsTTS';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLAudioElement
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
global.Audio = vi.fn().mockImplementation(() => ({
  play: mockPlay,
  pause: mockPause,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
})) as any;

describe('useElevenLabsTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useElevenLabsTTS());
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading during fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('calls stop before new speak', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    // Second speak should work without error (previous aborted)
    await act(async () => {
      result.current.speak('World', 'coach');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to browser TTS on 503', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    // Mock speechSynthesis
    const mockSpeak = vi.fn();
    global.speechSynthesis = { speak: mockSpeak, cancel: vi.fn(), getVoices: () => [] } as any;
    global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1,
      onend: null,
      onerror: null,
    })) as any;

    const { result } = renderHook(() => useElevenLabsTTS({ fallbackToBrowser: true }));

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    expect(mockSpeak).toHaveBeenCalled();
  });
});
