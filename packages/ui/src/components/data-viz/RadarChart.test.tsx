import { render, screen } from '@testing-library/react';
import { RadarChart } from './RadarChart';
import type { Dimension } from '@life-design/core';

const mockScores: Record<Dimension, number> = {
  career: 7, finance: 5, health: 8, fitness: 6,
  family: 9, social: 4, romance: 6, growth: 7,
};

describe('RadarChart', () => {
  it('renders an SVG element', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders 8 axis labels', () => {
    render(<RadarChart scores={mockScores} />);
    expect(screen.getByText('Career')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Romance')).toBeInTheDocument();
  });

  it('renders 3 grid rings', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    const circles = container.querySelectorAll('circle[class*="grid"]');
    expect(circles.length).toBe(3);
  });

  it('renders the data polygon', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('renders 8 vertex dots', () => {
    const { container } = render(<RadarChart scores={mockScores} />);
    const dots = container.querySelectorAll('circle[data-dimension]');
    expect(dots.length).toBe(8);
  });

  it('accepts custom size', () => {
    const { container } = render(<RadarChart scores={mockScores} size={400} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('400');
  });
});
