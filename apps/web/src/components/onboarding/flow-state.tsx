'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  ONBOARDING_SESSION_STORAGE_KEY,
  clearOnboardingSessionInStorage,
  createOnboardingSessionPatchQueue,
  loadOnboardingSessionFromStorage,
  parseOnboardingSession,
} from '@/lib/onboarding-session';

export type OnboardingStep =
  | 'video'
  | 'theme'
  | 'archetype'
  | 'voice'
  | 'conversation'
  | 'calendar_connect'
  | 'complete';

interface FlowState {
  currentStep: OnboardingStep;
  isVideoComplete: boolean;
  hasSkippedVideo: boolean;
  selectedTheme: string | null;
  selectedArchetype: string | null;
  selectedVoice: string | null;
  canSkipVideo: boolean;
  isTransitioning: boolean;
}

interface FlowContextType extends FlowState {
  // Navigation
  goToStep: (step: OnboardingStep) => void;
  goBack: () => void;
  nextStep: () => void;
  
  // Video
  markVideoComplete: () => void;
  skipVideo: () => void;
  enableVideoSkip: () => void;
  
  // Selections
  setTheme: (theme: string) => void;
  setArchetype: (archetype: string) => void;
  setVoice: (voice: string) => void;
  
  // Reset
  resetFlow: () => void;
  
  // Progress
  canGoBack: boolean;
  progress: number;
}

const stepOrder: OnboardingStep[] = ['video', 'theme', 'archetype', 'voice', 'conversation', 'calendar_connect', 'complete'];

const FlowContext = createContext<FlowContextType | undefined>(undefined);

interface FlowStateProviderProps {
  children: ReactNode;
  onComplete?: () => void;
}

export function FlowStateProvider({ children, onComplete }: FlowStateProviderProps) {
  const [mounted, setMounted] = useState(false);
  const patchQueueRef = React.useRef<ReturnType<typeof createOnboardingSessionPatchQueue> | null>(null);
  
  const [state, setState] = useState<FlowState>({
    currentStep: 'video',
    isVideoComplete: false,
    hasSkippedVideo: false,
    selectedTheme: null,
    selectedArchetype: null,
    selectedVoice: null,
    canSkipVideo: false,
    isTransitioning: false,
  });

  // Hydrate from localStorage
  useEffect(() => {
    patchQueueRef.current = createOnboardingSessionPatchQueue(localStorage);
    const session = loadOnboardingSessionFromStorage(localStorage);
    setState((prev) => ({
      ...prev,
      currentStep: session.flow.currentStep,
      isVideoComplete: session.flow.isVideoComplete,
      hasSkippedVideo: session.flow.hasSkippedVideo,
      selectedTheme: session.flow.selectedTheme,
      selectedArchetype: session.flow.selectedArchetype,
      selectedVoice: session.flow.selectedVoice,
      canSkipVideo: false,
      isTransitioning: false,
    }));
    setMounted(true);
    return () => {
      patchQueueRef.current?.flush();
      patchQueueRef.current?.dispose();
      patchQueueRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ONBOARDING_SESSION_STORAGE_KEY || !event.newValue) return;
      const session = parseOnboardingSession(event.newValue);
      if (!session) return;
      setState((prev) => ({
        ...prev,
        currentStep: session.flow.currentStep,
        isVideoComplete: session.flow.isVideoComplete,
        hasSkippedVideo: session.flow.hasSkippedVideo,
        selectedTheme: session.flow.selectedTheme,
        selectedArchetype: session.flow.selectedArchetype,
        selectedVoice: session.flow.selectedVoice,
      }));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!mounted || !patchQueueRef.current) return;
    patchQueueRef.current.schedule({
      flow: {
        currentStep: state.currentStep,
        isVideoComplete: state.isVideoComplete,
        hasSkippedVideo: state.hasSkippedVideo,
        selectedTheme: state.selectedTheme,
        selectedArchetype: state.selectedArchetype,
        selectedVoice: state.selectedVoice,
      },
    });
  }, [state, mounted]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, isTransitioning: true }));
    
    // Smooth transition delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentStep: step,
        isTransitioning: false,
      }));
      
      if (step === 'complete') {
        onComplete?.();
      }
    }, 400);
  }, [onComplete]);

  const nextStep = useCallback(() => {
    const currentIdx = stepOrder.indexOf(state.currentStep);
    if (currentIdx < stepOrder.length - 1) {
      goToStep(stepOrder[currentIdx + 1]);
    }
  }, [state.currentStep, goToStep]);

  const goBack = useCallback(() => {
    const currentIdx = stepOrder.indexOf(state.currentStep);
    if (currentIdx > 0) {
      // Can't go back to video once completed
      if (state.currentStep === 'theme' && state.isVideoComplete) {
        return;
      }
      goToStep(stepOrder[currentIdx - 1]);
    }
  }, [state.currentStep, state.isVideoComplete, goToStep]);

  const markVideoComplete = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isVideoComplete: true,
      currentStep: 'theme',
    }));
  }, []);

  const skipVideo = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      hasSkippedVideo: true,
      isVideoComplete: true,
    }));
    goToStep('theme');
  }, [goToStep]);

  const enableVideoSkip = useCallback(() => {
    setState(prev => ({ ...prev, canSkipVideo: true }));
  }, []);

  const setTheme = useCallback((theme: string) => {
    setState(prev => ({ ...prev, selectedTheme: theme }));
  }, []);

  const setVoice = useCallback((voice: string) => {
    setState(prev => ({ ...prev, selectedVoice: voice }));
  }, []);

  const setArchetype = useCallback((archetype: string) => {
    setState(prev => ({ ...prev, selectedArchetype: archetype }));
  }, []);

  const resetFlow = useCallback(() => {
    patchQueueRef.current?.dispose();
    clearOnboardingSessionInStorage(localStorage);
    patchQueueRef.current = createOnboardingSessionPatchQueue(localStorage);
    setState({
      currentStep: 'video',
      isVideoComplete: false,
      hasSkippedVideo: false,
      selectedTheme: null,
      selectedArchetype: null,
      selectedVoice: null,
      canSkipVideo: false,
      isTransitioning: false,
    });
  }, []);

  const currentIdx = stepOrder.indexOf(state.currentStep);
  const canGoBack = currentIdx > 0 && !(state.currentStep === 'theme' && state.isVideoComplete);
  const progress = ((currentIdx + 1) / stepOrder.length) * 100;

  const value: FlowContextType = {
    ...state,
    goToStep,
    goBack,
    nextStep,
    markVideoComplete,
    skipVideo,
    enableVideoSkip,
    setTheme,
    setArchetype,
    setVoice,
    resetFlow,
    canGoBack,
    progress,
  };

  if (!mounted) {
    return null;
  }

  return (
    <FlowContext.Provider value={value}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlowState() {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error('useFlowState must be used within a FlowStateProvider');
  }
  return context;
}
