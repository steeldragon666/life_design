import { render, screen } from '@testing-library/react';
import { Input, Select, FormField } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('applies error classes without hardcoded hex', () => {
    const { container } = render(<Input error />);
    const el = container.querySelector('input')!;
    expect(el.className).toContain('border-destructive');
    expect(el.className).not.toContain('#CC3333');
    expect(el.className).not.toContain('#cc3333');
  });
});

describe('Select', () => {
  it('has cursor-pointer class', () => {
    const { container } = render(
      <Select>
        <option>A</option>
      </Select>,
    );
    const el = container.querySelector('select')!;
    expect(el.className).toContain('cursor-pointer');
  });
});

describe('FormField', () => {
  it('shows error without hardcoded hex', () => {
    render(
      <FormField label="Email" error="Invalid">
        <Input />
      </FormField>,
    );
    const errorEl = screen.getByText('Invalid');
    expect(errorEl.className).toContain('text-destructive');
    expect(errorEl.className).not.toContain('#CC3333');
  });
});
