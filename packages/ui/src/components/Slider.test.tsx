import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with default value', () => {
    render(<Slider min={0} max={100} value={50} onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders labels when provided', () => {
    render(<Slider min={1} max={5} value={3} labels={['Low', 'High']} onChange={() => {}} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onChange on input change', () => {
    const handleChange = vi.fn();
    render(<Slider min={0} max={100} value={50} onChange={handleChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '75' } });
    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it('has cursor-pointer class', () => {
    render(<Slider min={0} max={100} value={50} onChange={() => {}} />);
    expect(screen.getByRole('slider').className).toContain('cursor-pointer');
  });
});
