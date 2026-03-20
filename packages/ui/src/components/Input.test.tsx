import { render, screen } from '@testing-library/react';
import { Input, Textarea, FormField, Select } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });
  it('applies error styling when error prop is set', () => {
    render(<Input error />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-[#CC3333]');
  });
});

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Write here" />);
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders a select element', () => {
    render(<Select><option>Option 1</option></Select>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  it('applies error styling', () => {
    render(<Select error><option>A</option></Select>);
    expect(screen.getByRole('combobox').className).toContain('border-[#CC3333]');
  });
});

describe('FormField', () => {
  it('renders label and input', () => {
    render(<FormField label="Email"><Input /></FormField>);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  it('shows error message', () => {
    render(<FormField label="Name" error="Required"><Input error /></FormField>);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
  it('shows helper text', () => {
    render(<FormField label="Bio" helper="Max 200 chars"><Textarea /></FormField>);
    expect(screen.getByText('Max 200 chars')).toBeInTheDocument();
  });
});
