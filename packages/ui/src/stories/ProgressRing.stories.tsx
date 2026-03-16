import type { Meta, StoryObj } from '@storybook/react';
import { ProgressRing } from '../components/data-viz/ProgressRing';

const meta: Meta<typeof ProgressRing> = {
  title: 'Data Viz/ProgressRing',
  component: ProgressRing,
};

export default meta;
type Story = StoryObj<typeof ProgressRing>;

export const Default: Story = { args: { value: 7.2, max: 10 } };
export const Low: Story = { args: { value: 3, max: 10 } };
export const Full: Story = { args: { value: 10, max: 10 } };
export const Large: Story = { args: { value: 8.5, max: 10, size: 80 } };
