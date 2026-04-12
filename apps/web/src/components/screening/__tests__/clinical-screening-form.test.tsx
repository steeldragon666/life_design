import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicalScreeningForm } from '../clinical-screening-form';

// Mock fetch for API calls
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: {} }),
  });
});

describe('ClinicalScreeningForm', () => {
  it('renders the first PHQ-9 question', () => {
    render(
      <ClinicalScreeningForm instrument="phq9" onComplete={vi.fn()} />,
    );
    expect(screen.getByText(/Little interest or pleasure/)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 9')).toBeInTheDocument();
  });

  it('renders the first GAD-7 question', () => {
    render(
      <ClinicalScreeningForm instrument="gad7" onComplete={vi.fn()} />,
    );
    expect(screen.getByText(/Feeling nervous, anxious/)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 7')).toBeInTheDocument();
  });

  it('shows the clinical disclaimer', () => {
    render(
      <ClinicalScreeningForm instrument="phq9" onComplete={vi.fn()} />,
    );
    expect(screen.getByText(/not a clinical diagnosis/i)).toBeInTheDocument();
  });

  it('advances to next question when an option is selected and Next is clicked', () => {
    render(
      <ClinicalScreeningForm instrument="phq9" onComplete={vi.fn()} />,
    );

    // Select "Not at all"
    fireEvent.click(screen.getByText('Not at all'));
    // Click Next
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Question 2 of 9')).toBeInTheDocument();
  });

  it('disables Next button when no option is selected', () => {
    render(
      <ClinicalScreeningForm instrument="phq9" onComplete={vi.fn()} />,
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('enables Next button after selecting an option', () => {
    render(
      <ClinicalScreeningForm instrument="phq9" onComplete={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('Not at all'));
    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();
  });

  it('goes back to the previous question when Back is clicked', () => {
    render(
      <ClinicalScreeningForm instrument="gad7" onComplete={vi.fn()} />,
    );

    // Go to question 2
    fireEvent.click(screen.getByText('Not at all'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Question 2 of 7')).toBeInTheDocument();

    // Go back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Question 1 of 7')).toBeInTheDocument();
  });

  it('shows Submit button on the last question', () => {
    render(
      <ClinicalScreeningForm instrument="gad7" onComplete={vi.fn()} />,
    );

    // Navigate through all 7 GAD-7 questions
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('Not at all'));
      fireEvent.click(screen.getByText('Next'));
    }

    // Last question should show Submit instead of Next
    expect(screen.getByText('Question 7 of 7')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('calls onComplete with a ScreeningResult when submitted', async () => {
    const onComplete = vi.fn();
    render(
      <ClinicalScreeningForm instrument="gad7" onComplete={onComplete} />,
    );

    // Answer all 7 questions with "Not at all" (0)
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('Not at all'));
      fireEvent.click(screen.getByText('Next'));
    }
    // Last question
    fireEvent.click(screen.getByText('Not at all'));
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          instrument: 'gad7',
          total: 0,
          severity: 'minimal',
        }),
      );
    });
  });

  it('renders WHO-5 questions with 6-point scale', () => {
    render(
      <ClinicalScreeningForm instrument="who5" onComplete={vi.fn()} />,
    );
    expect(screen.getByText(/cheerful and in good spirits/)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    // WHO-5 has 6 options (0-5)
    expect(screen.getByText('All of the time')).toBeInTheDocument();
  });
});
