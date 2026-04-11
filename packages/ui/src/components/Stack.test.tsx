import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Stack } from './Stack';

describe('Stack', () => {
  it('renders with default vertical direction', () => {
    const { container } = render(<Stack>Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-col');
  });

  it('applies horizontal direction', () => {
    const { container } = render(<Stack direction="horizontal">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-row');
  });

  it('applies gap variants', () => {
    const { container } = render(<Stack gap="lg">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('gap-6');
  });

  it('applies none gap variant', () => {
    const { container } = render(<Stack gap="none">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('gap-0');
  });

  it('applies align variant', () => {
    const { container } = render(<Stack align="center">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('items-center');
  });

  it('applies justify variant', () => {
    const { container } = render(<Stack justify="between">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-between');
  });

  it('renders children', () => {
    render(<Stack><span>Child</span></Stack>);
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Stack className="extra">Items</Stack>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('extra');
  });
});
