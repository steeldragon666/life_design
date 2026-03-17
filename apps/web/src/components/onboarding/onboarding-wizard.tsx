'use client';

import { useFlowState } from './flow-state';
import ProgressDots from './progress-dots';
import WelcomeStep from './steps/welcome-step';
import NameStep from './steps/name-step';
import AboutStep from './steps/about-step';
import MentorStep from './steps/mentor-step';
import CompleteStep from './steps/complete-step';

function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="p-2 -ml-2 rounded-lg text-[#7D756A] hover:text-[#1A1816] hover:bg-[#E8E4DD]/50 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

export default function OnboardingWizard() {
  const { currentStep, isTransitioning, goBack, canGoBack } = useFlowState();

  // Welcome step is full-screen with no header
  if (currentStep === 'welcome') {
    return (
      <div className={`transition-opacity duration-400 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <WelcomeStep />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return <NameStep />;
      case 'about':
        return <AboutStep />;
      case 'mentor':
        return <MentorStep />;
      case 'complete':
        return <CompleteStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F5F3EF]/80 backdrop-blur-sm border-b border-[#E8E4DD]/50 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="w-10">
            {canGoBack && <BackArrow onClick={goBack} />}
          </div>
          <ProgressDots />
          <div className="w-10" />
        </div>
      </header>

      {/* Step content */}
      <main className={`transition-opacity duration-400 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {renderStep()}
      </main>
    </div>
  );
}
