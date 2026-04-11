import type { Meta, StoryObj } from '@storybook/react';
import { Confetti } from '../components/Confetti';

const meta: Meta<typeof Confetti> = {
  title: 'Components/Confetti',
  component: Confetti,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Confetti>;

export const Default: Story = {
  args: {},
};

export const CustomColors: Story = {
  args: {
    colors: ['#FF6B6B', '#4ECDC4', '#FFE66D'],
  },
};

export const FewParticles: Story = {
  args: {
    particleCount: 10,
  },
};

export const ManyParticles: Story = {
  args: {
    particleCount: 60,
  },
};
