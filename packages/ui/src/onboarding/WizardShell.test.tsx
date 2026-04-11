import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WizardShell } from './WizardShell';

describe('WizardShell', () => {
  it('renders children', () => {
    render(
      <WizardShell progress={50}>
        <p>Step content</p>
      </WizardShell>,
    );
    expect(screen.getByText('Step content')).toBeInTheDocument();
  });

  it('renders the progress bar', () => {
    render(
      <WizardShell progress={42}>
        <p>Content</p>
      </WizardShell>,
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '42');
  });

  it('hides the back button when canGoBack is false', () => {
    render(
      <WizardShell progress={10} canGoBack={false} onBack={() => {}}>
        <p>Content</p>
      </WizardShell>,
    );
    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
  });

  it('shows the back button when canGoBack is true and onBack is provided', () => {
    const onBack = vi.fn();
    render(
      <WizardShell progress={10} canGoBack onBack={onBack}>
        <p>Content</p>
      </WizardShell>,
    );
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <WizardShell progress={10} canGoBack onBack={onBack}>
        <p>Content</p>
      </WizardShell>,
    );
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders sectionLabel when provided', () => {
    render(
      <WizardShell progress={25} sectionLabel="Personal Info">
        <p>Content</p>
      </WizardShell>,
    );
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
  });

  it('does not render sectionLabel when not provided', () => {
    const { container } = render(
      <WizardShell progress={25}>
        <p>Content</p>
      </WizardShell>,
    );
    const labels = container.querySelectorAll('.text-xs.font-medium');
    expect(labels).toHaveLength(0);
  });
});
