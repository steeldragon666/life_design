'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Microphone, MicrophoneSlash, Square, WarningCircle } from '@phosphor-icons/react';
import { WaveformBars } from './chat-bubble';

export interface VoiceRecorderResult {
  blob: Blob;
  transcription: string;
  duration: number;
  detectedEmotion?: string;
}

interface VoiceRecorderProps {
  onResult: (result: VoiceRecorderResult) => void;
  onCancel: () => void;
  maxDurationSeconds?: number;
}

type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

export default function VoiceRecorder({
  onResult,
  onCancel,
  maxDurationSeconds = 120,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* Use unknown so we don't need the SpeechRecognition global type */
  const recognitionRef = useRef<{ stop(): void } | null>(null);
  const transcriptionRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);

  /* Clean up on unmount */
  useEffect(() => {
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-stop at max duration */
  useEffect(() => {
    if (state === 'recording' && elapsed >= maxDurationSeconds) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, maxDurationSeconds, state]);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
  }

  const startSpeechRecognition = useCallback(() => {
    /* Web Speech API types: access via window to avoid missing-lib TS errors */
    type SpeechRecognitionCtor = new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      start(): void;
      stop(): void;
    };

    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };

    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]?.[0]?.transcript ?? '';
      }
      transcriptionRef.current = transcript;
    };

    recognition.onerror = () => {
      /* Silently fail — speech recognition is enhancement only */
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      /* noop */
    }
  }, []);

  async function handleStart() {
    setErrorMessage('');
    setState('requesting');
    chunksRef.current = [];
    transcriptionRef.current = '';

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone access is not supported in this browser.');
      setState('error');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const domErr = err as DOMException;
      if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was denied. Please allow access in browser settings.');
      } else if (domErr.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
      } else {
        setErrorMessage('Could not access microphone. Please check your browser settings.');
      }
      setState('error');
      return;
    }

    streamRef.current = stream;

    /* Determine supported MIME type */
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/ogg')
      ? 'audio/ogg'
      : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      const transcription = transcriptionRef.current.trim();

      setState('processing');

      /* Small delay to show processing state */
      await new Promise<void>((resolve) => setTimeout(resolve, 400));

      onResult({
        blob,
        transcription,
        duration,
        detectedEmotion: undefined, // Would come from server-side analysis
      });

      setState('idle');
    };

    recorder.start(250); // Collect in 250ms chunks
    startTimeRef.current = Date.now();
    setState('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    startSpeechRecognition();
  }

  function handleStop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleCancel() {
    stopAll();
    setState('idle');
    setElapsed(0);
    onCancel();
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const progressPercent = Math.min((elapsed / maxDurationSeconds) * 100, 100);
  const nearLimit = elapsed >= maxDurationSeconds * 0.8;

  /* ------------------------------------------------------------------ */
  /* RENDER                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm p-4 flex flex-col gap-3"
      role="region"
      aria-label="Voice recorder"
    >
      {/* Error state */}
      {state === 'error' && (
        <div className="flex items-start gap-2 text-rose-400 text-sm">
          <WarningCircle size={16} weight="light" className="flex-shrink-0 mt-0.5" />
          <p className="font-serif">{errorMessage}</p>
        </div>
      )}

      {/* Main controls row */}
      <div className="flex items-center gap-4">
        {/* Mic / Stop button */}
        {state === 'idle' || state === 'error' ? (
          <button
            onClick={handleStart}
            className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 bg-sage-600 hover:bg-sage-500 active:scale-95 shadow-lg shadow-sage-500/30"
            aria-label="Start recording"
          >
            <Microphone size={20} weight="light" className="text-white" />
          </button>
        ) : state === 'requesting' ? (
          <button
            disabled
            className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white/10 cursor-wait"
            aria-label="Requesting microphone permission"
          >
            <MicrophoneSlash size={20} weight="light" className="text-white/40" />
          </button>
        ) : state === 'recording' ? (
          <button
            onClick={handleStop}
            className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-500/30"
            style={{ animation: 'recordingPulse 1.5s ease-in-out infinite' }}
            aria-label="Stop recording"
          >
            <Square size={16} weight="fill" className="text-white" />
          </button>
        ) : (
          /* processing */
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white/10">
            <div className="h-4 w-4 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Status / waveform area */}
        <div className="flex-1 min-w-0">
          {state === 'idle' && (
            <p className="text-sm text-white/40 font-serif">
              Tap to record a voice message
            </p>
          )}
          {state === 'requesting' && (
            <p className="text-sm text-white/50 font-serif">
              Requesting microphone access...
            </p>
          )}
          {state === 'recording' && (
            <div className="flex items-center gap-3">
              <WaveformBars count={16} active className="text-rose-400" />
              <span
                className={`text-sm tabular-nums font-medium font-mono ${nearLimit ? 'text-amber-400' : 'text-white/70'}`}
              >
                {formatTime(elapsed)}
              </span>
            </div>
          )}
          {state === 'processing' && (
            <p className="text-sm text-white/50 font-serif">
              Processing audio...
            </p>
          )}
        </div>

        {/* Cancel button */}
        {(state === 'recording' || state === 'requesting') && (
          <button
            onClick={handleCancel}
            className="flex-shrink-0 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
            aria-label="Cancel recording"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar (only when recording) */}
      {state === 'recording' && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              nearLimit ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={elapsed}
            aria-valuemax={maxDurationSeconds}
          />
        </div>
      )}

      <style>{`
        @keyframes recordingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}
