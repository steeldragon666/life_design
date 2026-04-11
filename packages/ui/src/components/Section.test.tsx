import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Section } from './Section';

describe('Section', () => {
  it('renders children', () => {
    render(<Section>Section content</Section>);
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders heading as h2 by default', () => {
    render(<Section heading="My Heading">Content</Section>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('My Heading');
  });

  it('renders heading with custom as tag', () => {
    render(<Section heading="Title" as="h3">Content</Section>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Title');
  });

  it('renders subtitle when provided', () => {
    render(<Section heading="Title" subtitle="A subtitle">Content</Section>);
    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle without heading', () => {
    render(<Section subtitle="Orphan subtitle">Content</Section>);
    expect(screen.queryByText('Orphan subtitle')).not.toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<Section className="custom-class">Content</Section>);
    const section = container.querySelector('section');
    expect(section).toHaveClass('custom-class');
  });
});
