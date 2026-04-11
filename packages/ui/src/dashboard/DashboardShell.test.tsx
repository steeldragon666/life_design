import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardShell } from './DashboardShell';

describe('DashboardShell', () => {
  it('renders children in main area', () => {
    render(<DashboardShell>Main content</DashboardShell>);
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders nav slot when provided', () => {
    render(
      <DashboardShell nav={<div data-testid="nav">Nav</div>}>
        Content
      </DashboardShell>
    );
    expect(screen.getByTestId('nav')).toBeInTheDocument();
  });

  it('renders sidebar slot when provided', () => {
    render(
      <DashboardShell sidebar={<div data-testid="sidebar">Sidebar</div>}>
        Content
      </DashboardShell>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('does not render sidebar when not provided', () => {
    const { container } = render(<DashboardShell>Content</DashboardShell>);
    expect(container.querySelector('aside')).toBeNull();
  });

  it('merges custom className', () => {
    const { container } = render(
      <DashboardShell className="custom-class">Content</DashboardShell>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
