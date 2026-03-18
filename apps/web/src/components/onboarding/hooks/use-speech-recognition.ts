import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean }; length: number } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: ((event?: Event) => void) | null;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

interface UseSpeechRecognitionOptions {
  onSubmitTranscript: (transcript: string) => void;
  onErrorChange?: (message: string | null) => void;
}

export function useSpeechRecognition({
  onSubmitTranscript,
  onErrorChange,
}: UseSpeechRecognitionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isRecordingRef = useRef(false);
  const currentTranscriptRef = useRef('');

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    currentTranscriptRef.current = currentTranscript;
  }, [currentTranscript]);

  useEffect(() => {
    const win = window as Window & {
      webkitSpeechRecognition?: RecognitionConstructor;
      SpeechRecognition?: RecognitionConstructor;
    };

    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSupportsSpeechRecognition(false);
      return;
    }

    setSupportsSpeechRecognition(true);
    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionLike;
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: { resultIndex: number; results: { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean }; length: number } }) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += segment;
        } else {
          interimTranscript += segment;
        }
      }

      if (finalTranscript) {
        setCurrentTranscript((prev) => prev + finalTranscript);
      }
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        onErrorChange?.('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'no-speech') {
        setTranscript('No speech detected. Please try speaking again.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (currentTranscriptRef.current && isRecordingRef.current) {
        onSubmitTranscript(currentTranscriptRef.current);
      }
    };

    return () => {
      recognition.stop();
    };
  }, [onErrorChange, onSubmitTranscript]);

  const clearCapturedSpeech = useCallback(() => {
    setTranscript('');
    setCurrentTranscript('');
  }, []);

  const startRecording = useCallback(async () => {
    if (!supportsSpeechRecognition || !recognitionRef.current) {
      onErrorChange?.('Voice input is unavailable in this browser. You can continue with text input below.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      clearCapturedSpeech();
      setTranscript('Listening...');
      setIsRecording(true);
      onErrorChange?.(null);
      recognitionRef.current.start();
    } catch {
      onErrorChange?.('Microphone access denied. Please allow microphone permissions.');
    }
  }, [clearCapturedSpeech, onErrorChange, supportsSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsRecording(false);
    setTranscript('Processing...');

    if (currentTranscriptRef.current) {
      onSubmitTranscript(currentTranscriptRef.current);
    } else {
      setTranscript('No speech detected. Please try again.');
      window.setTimeout(() => setTranscript(''), 3000);
    }
  }, [onSubmitTranscript]);

  return {
    isRecording,
    transcript,
    supportsSpeechRecognition,
    startRecording,
    stopRecording,
    clearCapturedSpeech,
  };
}
