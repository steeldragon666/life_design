import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading', () => {
    render(<EmptyState heading="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState heading="Empty" icon={<span data-testid="icon">icon</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState heading="Empty" description="Try adding some items" />);
    expect(screen.getByText('Try adding some items')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState heading="Empty" action={<button>Add item</button>} />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    const { container } = render(<EmptyState heading="Nothing here" />);
    expect(container.querySelector('.text-stone-400')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<EmptyState heading="Empty" className="bg-white" />);
    expect(container.firstChild).toHaveClass('bg-white');
  });
});
