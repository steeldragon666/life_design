'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { analyzeVoiceJournal } from '@life-design/ai'; // This will be called via a server action or client-side if key is safe

export default function VoiceCheckin() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'analyzing' | 'success'>('idle');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        setStatus('transcribing');
        // In a real app, we'd send this to a transcription service (Whisper/Gemini)
        // For this demo, we'll simulate the transcript extraction
        simulateAIAnalysis();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus('recording');
    } catch (err) {
      console.error('Recording failed:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const simulateAIAnalysis = async () => {
    setIsProcessing(true);
    setStatus('analyzing');

    // Simulate Gemini 1.5 processing
    await new Promise(r => setTimeout(r, 3000));

    setStatus('success');
    setIsProcessing(false);

    setTimeout(() => {
      setStatus('idle');
    }, 5000);
  };

  return (
    <div className="glass-card relative overflow-hidden group p-8 flex flex-col items-center justify-center text-center space-y-6">
      <div className="absolute inset-0 bg-primary-500/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative">
        <div className={`absolute inset-0 bg-primary-500/20 rounded-full blur-xl scale-150 transition-opacity duration-500 ${isRecording ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-primary-600 hover:bg-primary-500'}`}
        >
          {isRecording
            ? <Square size={40} fill="currentColor" className="text-white" />
            : <Mic size={40} className="text-white" />
          }
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white tracking-tight">Voice Journal</h3>
        <p className="text-stone-400 font-medium max-w-xs mx-auto">
          {status === 'idle' && "Talk through your day. We'll extract the scores."}
          {status === 'recording' && "I'm listening. Tell me about your life right now."}
          {status === 'transcribing' && "Transcribing your thoughts..."}
          {status === 'analyzing' && "Gemini is analyzing your dimensions..."}
          {status === 'success' && "Insights extracted & scores updated!"}
        </p>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-primary-400 font-bold animate-pulse">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs uppercase tracking-widest">AI Extraction Active</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <CheckCircle size={20} />
          <span className="text-xs uppercase tracking-widest text-emerald-500">Multimodal Sync Complete</span>
        </div>
      )}
    </div>
  );
}
