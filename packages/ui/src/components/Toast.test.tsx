import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders message text', () => {
    render(<Toast variant="success" message="Saved!" onDismiss={() => {}} />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('applies success variant with sage border', () => {
    const { container } = render(<Toast variant="success" message="OK" onDismiss={() => {}} />);
    expect((container.firstChild as HTMLElement).className).toContain('border-l-sage-500');
  });

  it('applies error variant with red border', () => {
    const { container } = render(<Toast variant="error" message="Fail" onDismiss={() => {}} />);
    expect((container.firstChild as HTMLElement).className).toContain('border-l-[#CC3333]');
  });

  it('renders dismiss button', () => {
    render(<Toast variant="info" message="Note" onDismiss={() => {}} />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });
});
