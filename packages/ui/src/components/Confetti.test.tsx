import { render } from '@testing-library/react';
import { Confetti } from './Confetti';

describe('Confetti', () => {
  it('renders particles with default count', () => {
    const { container } = render(<Confetti />);
    const particles = container.querySelectorAll('.animate-confetti-fall');
    expect(particles.length).toBe(30);
  });

  it('renders custom particle count', () => {
    const { container } = render(<Confetti particleCount={10} />);
    const particles = container.querySelectorAll('.animate-confetti-fall');
    expect(particles.length).toBe(10);
  });

  it('uses custom colors', () => {
    const { container } = render(<Confetti colors={['#FF0000']} particleCount={3} />);
    const particles = container.querySelectorAll('.animate-confetti-fall');
    particles.forEach((p) => {
      expect((p as HTMLElement).style.backgroundColor).toBe('rgb(255, 0, 0)');
    });
  });

  it('is aria-hidden', () => {
    const { container } = render(<Confetti />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('is pointer-events-none', () => {
    const { container } = render(<Confetti />);
    expect((container.firstChild as HTMLElement).className).toContain('pointer-events-none');
  });

  it('returns null when prefers-reduced-motion is enabled', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const { container } = render(<Confetti />);
    expect(container.firstChild).toBeNull();
    window.matchMedia = originalMatchMedia;
  });
});
