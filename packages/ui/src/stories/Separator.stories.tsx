import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../components/Separator';

const meta: Meta<typeof Separator> = {
  title: 'Components/Separator',
  component: Separator,
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  decorators: [(Story) => <div className="h-16"><Story /></div>],
};

export const Decorative: Story = {
  args: { decorative: true },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};
