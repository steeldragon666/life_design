import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { LottieAnimation } from './LottieAnimation';

// Mock lottie-react
vi.mock('lottie-react', () => ({
  default: ({ animationData, loop, autoplay, className }: Record<string, unknown>) => (
    <div data-testid="lottie" data-loop={loop} data-autoplay={autoplay} className={className as string}>
      {JSON.stringify(animationData)}
    </div>
  ),
}));

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockAnimation = { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 100, h: 100 };

describe('LottieAnimation', () => {
  it('renders without crashing', async () => {
    const { findByTestId } = render(<LottieAnimation animationData={mockAnimation} />);
    const el = await findByTestId('lottie');
    expect(el).toBeInTheDocument();
  });

  it('passes loop and autoplay props', async () => {
    const { findByTestId } = render(
      <LottieAnimation animationData={mockAnimation} loop={false} autoplay={false} />,
    );
    const el = await findByTestId('lottie');
    expect(el).toHaveAttribute('data-loop', 'false');
    expect(el).toHaveAttribute('data-autoplay', 'false');
  });

  it('applies custom className', async () => {
    const { findByTestId } = render(
      <LottieAnimation animationData={mockAnimation} className="custom-class" />,
    );
    const el = await findByTestId('lottie');
    expect(el.className).toContain('custom-class');
  });

  it('returns null when prefers-reduced-motion is enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const { container } = render(<LottieAnimation animationData={mockAnimation} />);
    expect(container.firstChild).toBeNull();
  });
});
