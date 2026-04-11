import { render, screen } from '@testing-library/react';
import { Modal } from './Modal';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  title: 'Test Modal',
  children: <p>Content</p>,
};

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Modal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders children when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('has close button with cursor-pointer', () => {
    render(<Modal {...defaultProps} />);
    const closeBtn = screen.getByLabelText('Close');
    expect(closeBtn.className).toContain('cursor-pointer');
  });

  it('renders title', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });
});
