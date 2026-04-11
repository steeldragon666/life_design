import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/test';
import { Skeleton, CardSkeleton, SparklineSkeleton, ProgressRingSkeleton, ScheduleWidgetSkeleton } from '../components/Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { className: 'h-4 w-32' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.firstElementChild!.firstElementChild!;
    await expect(el.className).toContain('animate-pulse-skeleton');
  },
};

export const CardShape: Story = {
  render: () => <CardSkeleton />,
};

export const Sparkline: Story = {
  render: () => <SparklineSkeleton />,
};

export const ProgressRing: Story = {
  render: () => <ProgressRingSkeleton />,
};

export const ScheduleWidget: Story = {
  render: () => <ScheduleWidgetSkeleton />,
};
