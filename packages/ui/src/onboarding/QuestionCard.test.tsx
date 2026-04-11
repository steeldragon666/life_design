import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuestionCard } from './QuestionCard';

describe('QuestionCard', () => {
  it('renders the question as a heading', () => {
    render(
      <QuestionCard question="What is your name?">
        <input />
      </QuestionCard>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'What is your name?' })).toBeInTheDocument();
  });

  it('renders helperText when provided', () => {
    render(
      <QuestionCard question="Your age?" helperText="We use this to personalize your plan.">
        <input />
      </QuestionCard>,
    );
    expect(screen.getByText('We use this to personalize your plan.')).toBeInTheDocument();
  });

  it('does not render helperText when not provided', () => {
    const { container } = render(
      <QuestionCard question="Your age?">
        <input />
      </QuestionCard>,
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders children', () => {
    render(
      <QuestionCard question="Favorite color?">
        <select data-testid="color-select">
          <option>Red</option>
          <option>Blue</option>
        </select>
      </QuestionCard>,
    );
    expect(screen.getByTestId('color-select')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <QuestionCard question="Test?" className="custom-class">
        <input />
      </QuestionCard>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
