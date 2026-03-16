import { render } from '@testing-library/react';
import { Skeleton, CardSkeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with pulse animation', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse-skeleton');
  });
  it('renders with custom dimensions', () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    expect((container.firstChild as HTMLElement).className).toContain('h-8');
  });
});

describe('CardSkeleton', () => {
  it('renders title and body lines', () => {
    const { container } = render(<CardSkeleton />);
    const lines = container.querySelectorAll('[class*="animate-pulse-skeleton"]');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});
