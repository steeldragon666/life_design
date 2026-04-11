import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Badge } from '../components/Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['sage', 'warm', 'accent', 'stone', 'success', 'warning', 'destructive'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Sage: Story = { args: { children: 'On Track', variant: 'sage' } };
export const Warm: Story = { args: { children: 'Warning', variant: 'warm' } };
export const Accent: Story = { args: { children: 'New', variant: 'accent' } };
export const Stone: Story = { args: { children: 'Default', variant: 'stone' } };
export const Success: Story = { args: { children: 'Complete', variant: 'success' } };
export const Warning: Story = { args: { children: 'Attention', variant: 'warning' } };
export const Destructive: Story = {
  args: { children: 'Error', variant: 'destructive' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Error');
    await expect(badge).toHaveClass('text-destructive');
  },
};
