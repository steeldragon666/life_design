import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '../components/Slider';

const meta: Meta<typeof Slider> = {
  title: 'Components/Slider',
  component: Slider,
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: { min: 0, max: 100, value: 50 },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <Slider {...args} value={value} onChange={setValue} />;
  },
};

export const WithLabels: Story = {
  args: { min: 1, max: 5, value: 3, labels: ['Low', 'High'] },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <Slider {...args} value={value} onChange={setValue} />;
  },
};

export const LikertScale: Story = {
  args: {
    min: 1,
    max: 7,
    value: 4,
    labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'],
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <Slider {...args} value={value} onChange={setValue} />;
  },
};
