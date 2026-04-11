import { render } from '@testing-library/react';
import { Icon } from './Icon';
import { ChevronLeft } from 'lucide-react';

describe('Icon', () => {
  it('renders lucide icon at default size', () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('renders at sm size', () => {
    const { container } = render(<Icon icon={ChevronLeft} size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
  });

  it('renders at lg size', () => {
    const { container } = render(<Icon icon={ChevronLeft} size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('applies shrink-0', () => {
    const { container } = render(<Icon icon={ChevronLeft} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('shrink-0');
  });

  it('merges custom className', () => {
    const { container } = render(<Icon icon={ChevronLeft} className="text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('text-red-500');
  });
});
