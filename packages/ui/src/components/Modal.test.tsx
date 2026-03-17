import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}>Content</Modal>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });
  it('renders children when open', () => {
    render(<Modal open onClose={() => {}}>Content</Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
  it('renders title', () => {
    render(<Modal open onClose={() => {}} title="Confirm">Body</Modal>);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>Body</Modal>);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test">Body</Modal>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
