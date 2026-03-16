import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, Popover } from './Tooltip';

describe('Tooltip', () => {
  it('renders trigger content', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });
  it('shows tooltip on mouse enter', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me').closest('span')!);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });
  it('hides tooltip on mouse leave', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    const trigger = screen.getByText('Hover me').closest('span')!;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Popover', () => {
  it('renders trigger', () => {
    render(<Popover content={<div>Details</div>}><button>Open</button></Popover>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
  it('shows popover on click', () => {
    render(<Popover content={<div>Details</div>}><button>Open</button></Popover>);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
