import { render } from '@testing-library/react';
import { LottieAnimation } from './LottieAnimation';

// Mock lottie-react
jest.mock('lottie-react', () => {
  return {
    __esModule: true,
    default: ({ animationData, loop, autoplay, className }: Record<string, unknown>) => (
      <div data-testid="lottie" data-loop={loop} data-autoplay={autoplay} className={className as string}>
        {JSON.stringify(animationData)}
      </div>
    ),
  };
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
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const { container } = render(<LottieAnimation animationData={mockAnimation} />);
    expect(container.firstChild).toBeNull();
    window.matchMedia = originalMatchMedia;
  });
});
