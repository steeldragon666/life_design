import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingClient from '../app/(protected)/onboarding/onboarding-client';

describe('OnboardingClient', () => {
  const mockMentors = [
    { id: 'm1', name: 'The Stoic', type: 'stoic', description: 'Wisdom from ancient philosophy' },
    { id: 'm2', name: 'The Coach', type: 'coach', description: 'Practical goal-setting guidance' },
  ];

  const mockOnComplete = vi.fn();
  const mockOnActivateMentor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome step initially', () => {
    render(
      <OnboardingClient
        mentors={mockMentors}
        onComplete={mockOnComplete}
        onActivateMentor={mockOnActivateMentor}
      />,
    );
    expect(screen.getByText(/welcome/i)).toBeDefined();
  });

  it('shows the dimensions step after clicking next', () => {
    render(
      <OnboardingClient
        mentors={mockMentors}
        onComplete={mockOnComplete}
        onActivateMentor={mockOnActivateMentor}
      />,
    );
    fireEvent.click(screen.getByText(/next/i));
    expect(screen.getByText(/The 8 Dimensions of Life/)).toBeDefined();
  });

  it('shows the mentor step after dimensions', () => {
    render(
      <OnboardingClient
        mentors={mockMentors}
        onComplete={mockOnComplete}
        onActivateMentor={mockOnActivateMentor}
      />,
    );
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    expect(screen.getByText(/The Stoic/)).toBeDefined();
    expect(screen.getByText(/The Coach/)).toBeDefined();
  });

  it('calls onActivateMentor when a mentor is selected', () => {
    render(
      <OnboardingClient
        mentors={mockMentors}
        onComplete={mockOnComplete}
        onActivateMentor={mockOnActivateMentor}
      />,
    );
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/The Stoic/));
    expect(mockOnActivateMentor).toHaveBeenCalledWith('m1');
  });

  it('calls onComplete on the final step', () => {
    render(
      <OnboardingClient
        mentors={mockMentors}
        onComplete={mockOnComplete}
        onActivateMentor={mockOnActivateMentor}
      />,
    );
    // Welcome -> Dimensions -> Mentors -> Finish
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/get started/i));
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
