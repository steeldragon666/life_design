import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/Input';
import { FormField } from '../components/Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Enter text...' } };
export const WithError: Story = {
  render: () => <FormField label="Email" error="Invalid email address"><Input placeholder="you@example.com" /></FormField>,
};
export const WithHelper: Story = {
  render: () => <FormField label="Name" helper="Your display name"><Input placeholder="John" /></FormField>,
};
