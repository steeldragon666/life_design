import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Toast } from '../components/Toast';

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  argTypes: {
    variant: { control: 'select', options: ['success', 'warning', 'error', 'info', 'achievement'] },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Success: Story = { args: { variant: 'success', message: 'Check-in saved!', onDismiss: () => {} } };
export const Error: Story = {
  args: { variant: 'error', message: 'Failed to save', onDismiss: () => {} },
  play: async ({ canvasElement }) => {
    const el = canvasElement.firstElementChild!.firstElementChild!;
    await expect(el.getAttribute('aria-live')).toBe('assertive');
    await expect(el.getAttribute('role')).toBe('alert');
  },
};
export const Warning: Story = { args: { variant: 'warning', message: 'Low score detected', onDismiss: () => {} } };
export const Info: Story = {
  args: { variant: 'info', message: 'New insights available', onDismiss: () => {} },
  play: async ({ canvasElement }) => {
    const el = canvasElement.firstElementChild!.firstElementChild!;
    await expect(el.getAttribute('aria-live')).toBe('polite');
  },
};
export const Achievement: Story = { args: { variant: 'achievement', message: 'Badge earned!', emoji: '\u{1F3C6}', description: 'You completed 7 consecutive check-ins', onDismiss: () => {} } };
