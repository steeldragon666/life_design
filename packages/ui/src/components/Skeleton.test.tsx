import { render } from '@testing-library/react';
import { Skeleton, CardSkeleton, DimensionGridSkeleton, InsightFeedSkeleton, MentorPanelSkeleton } from './Skeleton';

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

describe('DimensionGridSkeleton', () => {
  it('renders 8 skeleton cards in a grid', () => {
    const { container } = render(<DimensionGridSkeleton />);
    const cards = container.querySelectorAll('[class*="rounded-"]');
    // 8 CardSkeletons, each with inner skeletons
    expect(cards.length).toBeGreaterThanOrEqual(8);
  });
});

describe('InsightFeedSkeleton', () => {
  it('renders 3 skeleton cards stacked', () => {
    const { container } = render(<InsightFeedSkeleton />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children.length).toBe(3);
  });
});

describe('MentorPanelSkeleton', () => {
  it('renders header and message skeletons', () => {
    const { container } = render(<MentorPanelSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse-skeleton"]');
    // Avatar + name + status + 3 message bubbles = 6
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
