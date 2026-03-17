'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  ONBOARDING_SESSION_STORAGE_KEY,
  clearOnboardingSessionInStorage,
  createOnboardingSessionPatchQueue,
  loadOnboardingSessionFromStorage,
  parseOnboardingSession,
} from '@/lib/onboarding-session';

export type OnboardingStep = 'welcome' | 'name' | 'about' | 'mentor' | 'complete';

export const stepOrder: OnboardingStep[] = ['welcome', 'name', 'about', 'mentor', 'complete'];

interface FlowState {
  currentStep: OnboardingStep;
  userName: string | null;
  profession: string | null;
  interests: string[];
  postcode: string | null;
  selectedMentor: string | null;
  isTransitioning: boolean;
}

interface FlowContextType extends FlowState {
  // Navigation
  goToStep: (step: OnboardingStep) => void;
  goBack: () => void;
  nextStep: () => void;

  // Setters
  setUserName: (name: string) => void;
  setProfession: (profession: string) => void;
  setInterests: (interests: string[]) => void;
  setPostcode: (postcode: string) => void;
  setMentor: (mentor: string) => void;

  // Reset
  resetFlow: () => void;

  // Progress
  canGoBack: boolean;
  progress: number;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

interface FlowStateProviderProps {
  children: ReactNode;
  onComplete?: () => void;
}

export function FlowStateProvider({ children, onComplete }: FlowStateProviderProps) {
  const [mounted, setMounted] = useState(false);
  const patchQueueRef = React.useRef<ReturnType<typeof createOnboardingSessionPatchQueue> | null>(null);

  const [state, setState] = useState<FlowState>({
    currentStep: 'welcome',
    userName: null,
    profession: null,
    interests: [],
    postcode: null,
    selectedMentor: null,
    isTransitioning: false,
  });

  // Hydrate from localStorage
  useEffect(() => {
    patchQueueRef.current = createOnboardingSessionPatchQueue(localStorage);
    const session = loadOnboardingSessionFromStorage(localStorage);
    setState((prev) => ({
      ...prev,
      currentStep: session.flow.currentStep,
      userName: session.flow.userName,
      profession: session.flow.profession,
      interests: session.flow.interests,
      postcode: session.flow.postcode,
      selectedMentor: session.flow.selectedMentor,
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
        userName: session.flow.userName,
        profession: session.flow.profession,
        interests: session.flow.interests,
        postcode: session.flow.postcode,
        selectedMentor: session.flow.selectedMentor,
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
        userName: state.userName,
        profession: state.profession,
        interests: state.interests,
        postcode: state.postcode,
        selectedMentor: state.selectedMentor,
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
      goToStep(stepOrder[currentIdx - 1]);
    }
  }, [state.currentStep, goToStep]);

  const setUserName = useCallback((name: string) => {
    setState(prev => ({ ...prev, userName: name }));
  }, []);

  const setProfession = useCallback((profession: string) => {
    setState(prev => ({ ...prev, profession }));
  }, []);

  const setInterests = useCallback((interests: string[]) => {
    setState(prev => ({ ...prev, interests }));
  }, []);

  const setPostcode = useCallback((postcode: string) => {
    setState(prev => ({ ...prev, postcode }));
  }, []);

  const setMentor = useCallback((mentor: string) => {
    setState(prev => ({ ...prev, selectedMentor: mentor }));
  }, []);

  const resetFlow = useCallback(() => {
    patchQueueRef.current?.dispose();
    clearOnboardingSessionInStorage(localStorage);
    patchQueueRef.current = createOnboardingSessionPatchQueue(localStorage);
    setState({
      currentStep: 'welcome',
      userName: null,
      profession: null,
      interests: [],
      postcode: null,
      selectedMentor: null,
      isTransitioning: false,
    });
  }, []);

  const currentIdx = stepOrder.indexOf(state.currentStep);
  const canGoBack = currentIdx > 0;
  const progress = ((currentIdx + 1) / stepOrder.length) * 100;

  const value: FlowContextType = {
    ...state,
    goToStep,
    goBack,
    nextStep,
    setUserName,
    setProfession,
    setInterests,
    setPostcode,
    setMentor,
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
