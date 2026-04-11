import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Input, Select, FormField } from '../components/Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Enter text...' } };
export const WithError: Story = {
  render: () => <FormField label="Email" error="Invalid email address"><Input error placeholder="you@example.com" /></FormField>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const errorText = canvas.getByText('Invalid email address');
    await expect(errorText).toHaveClass('text-destructive');
  },
};
export const WithHelper: Story = {
  render: () => <FormField label="Name" helper="Your display name"><Input placeholder="John" /></FormField>,
};
export const SelectField: Story = {
  render: () => (
    <FormField label="Country">
      <Select>
        <option>USA</option>
        <option>Canada</option>
      </Select>
    </FormField>
  ),
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector('select')!;
    await expect(select).toHaveClass('cursor-pointer');
  },
};
