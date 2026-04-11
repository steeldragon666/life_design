import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClinicalScreeningForm } from '../clinical-screening-form';

describe('ClinicalScreeningForm', () => {
  it('renders PHQ-9 questions', () => {
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/Little interest or pleasure/)).toBeInTheDocument();
  });

  it('renders GAD-7 questions', () => {
    render(
      <ClinicalScreeningForm
        instrument="gad7"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/Feeling nervous, anxious/)).toBeInTheDocument();
  });

  it('shows disclaimer text', () => {
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );
    expect(screen.getByText(/not a clinical diagnosis/i)).toBeInTheDocument();
  });

  it('calls onComplete with scores when submitted', () => {
    const onComplete = vi.fn();
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={onComplete}
        onCriticalFlag={vi.fn()}
      />
    );

    // Select "Not at all" (0) for all 9 questions
    const radioGroups = screen.getAllByRole('radiogroup');
    radioGroups.forEach((group) => {
      const firstOption = group.querySelectorAll('input[type="radio"]')[0];
      if (firstOption) fireEvent.click(firstOption);
    });

    const submit = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submit);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        severity: 'minimal',
      })
    );
  });

  it('calls onCriticalFlag when PHQ-9 item 9 is non-zero', () => {
    const onCriticalFlag = vi.fn();
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={onCriticalFlag}
      />
    );

    // Find item 9's radio group (last one) and select "Several days" (value 1)
    const radioGroups = screen.getAllByRole('radiogroup');
    const lastGroup = radioGroups[radioGroups.length - 1];
    const severalDaysOption = lastGroup.querySelectorAll('input[type="radio"]')[1]; // index 1 = "Several days"
    if (severalDaysOption) fireEvent.click(severalDaysOption);

    expect(onCriticalFlag).toHaveBeenCalled();
  });

  it('disables submit button when not all questions answered', () => {
    render(
      <ClinicalScreeningForm
        instrument="phq9"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );

    const submit = screen.getByRole('button', { name: /submit/i });
    expect(submit).toBeDisabled();
  });

  it('enables submit button when all questions answered', () => {
    render(
      <ClinicalScreeningForm
        instrument="gad7"
        onComplete={vi.fn()}
        onCriticalFlag={vi.fn()}
      />
    );

    // Answer all 7 GAD-7 questions
    const radioGroups = screen.getAllByRole('radiogroup');
    radioGroups.forEach((group) => {
      const firstOption = group.querySelectorAll('input[type="radio"]')[0];
      if (firstOption) fireEvent.click(firstOption);
    });

    const submit = screen.getByRole('button', { name: /submit/i });
    expect(submit).not.toBeDisabled();
  });
});
