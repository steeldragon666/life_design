import type { Meta, StoryObj } from '@storybook/react';
import { RadarChart } from '../components/data-viz/RadarChart';

const meta: Meta<typeof RadarChart> = {
  title: 'Data Viz/RadarChart',
  component: RadarChart,
};

export default meta;
type Story = StoryObj<typeof RadarChart>;

export const Default: Story = {
  args: {
    scores: { career: 7, finance: 5, health: 8, fitness: 6, family: 9, social: 4, romance: 6, growth: 7 },
    size: 300,
  },
};

export const Small: Story = {
  args: {
    scores: { career: 3, finance: 8, health: 5, fitness: 7, family: 4, social: 9, romance: 5, growth: 6 },
    size: 200,
  },
};
