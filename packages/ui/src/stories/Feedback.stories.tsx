import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';

/* ── ProgressBar ─────────────────────────────────────── */

const progressMeta: Meta<typeof ProgressBar> = {
  title: 'Feedback/ProgressBar',
  component: ProgressBar,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['default', 'sage'] },
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
};

export default progressMeta;
type ProgressStory = StoryObj<typeof ProgressBar>;

export const Default: ProgressStory = {
  args: { value: 60 },
};

export const Small: ProgressStory = {
  args: { value: 40, size: 'sm' },
};

export const Large: ProgressStory = {
  args: { value: 80, size: 'lg' },
};

export const WithLabel: ProgressStory = {
  args: { value: 75, label: 'Profile completion' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-label', 'Profile completion');
    await expect(bar).toHaveAttribute('aria-valuenow', '75');
  },
};

export const SageVariant: ProgressStory = {
  args: { value: 50, variant: 'sage' },
};

/* ── EmptyState ──────────────────────────────────────── */

export const EmptyStateDefault: StoryObj = {
  render: () => <EmptyState heading="No items yet" description="Get started by creating your first item." />,
};

export const EmptyStateWithIconAndAction: StoryObj = {
  render: () => (
    <EmptyState
      icon={<Inbox size={48} />}
      heading="No messages"
      description="Your inbox is empty. New messages will appear here."
      action={
        <button className="px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors inline-flex items-center gap-2">
          <Plus size={16} />
          Compose
        </button>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No messages')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /compose/i })).toBeInTheDocument();
  },
};

/* ── ErrorBoundary ───────────────────────────────────── */

function BuggyCounter() {
  const [count, setCount] = useState(0);
  if (count >= 3) throw new Error('Counter crashed at 3!');
  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      className="px-4 py-2 bg-stone-100 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors"
    >
      Count: {count} (crashes at 3)
    </button>
  );
}

export const ErrorBoundaryDefault: StoryObj = {
  render: () => (
    <ErrorBoundary>
      <BuggyCounter />
    </ErrorBoundary>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    // Click 3 times to trigger the error
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);
    // Should now show error UI
    await expect(canvas.getByText('Something went wrong')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  },
};
