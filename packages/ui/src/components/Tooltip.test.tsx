import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('shows tooltip content on hover', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByText('Hover me').closest('span')!);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );
    const wrapper = screen.getByText('Hover me').closest('span')!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not contain hardcoded hex values in className', () => {
    render(
      <Tooltip content="Tip">
        <span>Target</span>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByText('Target').closest('span')!);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
});
