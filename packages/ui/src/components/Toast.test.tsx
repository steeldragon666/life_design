import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

const defaultProps = {
  message: 'Test message',
  onDismiss: vi.fn(),
};

describe('Toast', () => {
  it('renders the message', () => {
    render(<Toast {...defaultProps} variant="info" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('uses aria-live="assertive" and role="alert" for error variant', () => {
    const { container } = render(<Toast {...defaultProps} variant="error" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute('aria-live')).toBe('assertive');
    expect(el.getAttribute('role')).toBe('alert');
  });

  it('uses aria-live="polite" for non-error variants', () => {
    const { container } = render(<Toast {...defaultProps} variant="success" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('does not use role="alert" for non-error variants', () => {
    const { container } = render(<Toast {...defaultProps} variant="info" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute('role')).toBeNull();
  });

  it('uses token class instead of hardcoded hex for error border', () => {
    const { container } = render(<Toast {...defaultProps} variant="error" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('border-l-destructive');
    expect(el.className).not.toContain('#CC3333');
  });

  it('renders dismiss button', () => {
    render(<Toast {...defaultProps} variant="info" />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });
});
