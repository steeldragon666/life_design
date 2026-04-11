import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Card } from '../components/Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['default', 'raised', 'sunken', 'dimension'] },
    hoverable: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = { args: { children: 'Default card content', variant: 'default' } };
export const Raised: Story = { args: { children: 'Raised card', variant: 'raised' } };
export const Sunken: Story = { args: { children: 'Sunken card', variant: 'sunken' } };
export const Dimension: Story = { args: { children: 'Dimension card', variant: 'dimension', dimension: 'health' } };
export const Hoverable: Story = {
  args: { children: 'Hoverable card', hoverable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByText('Hoverable card').closest('div')!;
    await expect(card).toHaveClass('hover-lift');
    await expect(card).toHaveClass('cursor-pointer');
  },
};
