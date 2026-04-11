import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { StatCard } from '../components/StatCard';
import { DimensionCard } from '../components/DimensionCard';
import type { DimensionName } from '../components/DimensionCard';

/* ---------- StatCard ---------- */

const statMeta: Meta<typeof StatCard> = {
  title: 'DataDisplay/StatCard',
  component: StatCard,
  argTypes: {
    variant: { control: 'select', options: ['default', 'glass'] },
    trend: { control: 'select', options: ['up', 'down', 'flat'] },
  },
};

export default statMeta;
type StatStory = StoryObj<typeof StatCard>;

export const Default: StatStory = {
  args: { label: 'Total Score', value: 85 },
};

export const WithTrend: StatStory = {
  args: { label: 'Weekly Average', value: '7.4', trend: 'up', changePercent: 12.3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Trending up')).toBeInTheDocument();
    await expect(canvas.getByText('12.3%')).toBeInTheDocument();
  },
};

export const WithSparkline: StatStory = {
  args: {
    label: 'Progress',
    value: '78%',
    trend: 'up',
    changePercent: 5.2,
  },
  render: (args) => (
    <StatCard
      {...args}
      sparkline={
        <div className="h-8 w-full rounded bg-stone-100 flex items-center justify-center text-xs text-stone-400">
          Sparkline placeholder
        </div>
      }
    />
  ),
};

export const GlassVariant: StatStory = {
  args: { label: 'Sessions', value: 42, variant: 'glass' },
  decorators: [
    (Story) => (
      <div className="bg-stone-800 p-6 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

/* ---------- DimensionCard ---------- */

const dimensions: { dimension: DimensionName; label: string; score: number; trend: 'up' | 'down' | 'flat' }[] = [
  { dimension: 'career', label: 'Career', score: 7.2, trend: 'up' },
  { dimension: 'finance', label: 'Finance', score: 6.8, trend: 'flat' },
  { dimension: 'health', label: 'Health', score: 8.1, trend: 'up' },
  { dimension: 'fitness', label: 'Fitness', score: 5.5, trend: 'down' },
  { dimension: 'family', label: 'Family', score: 9.0, trend: 'up' },
  { dimension: 'social', label: 'Social', score: 6.3, trend: 'flat' },
  { dimension: 'romance', label: 'Romance', score: 7.7, trend: 'up' },
  { dimension: 'growth', label: 'Growth', score: 8.4, trend: 'up' },
];

const dimMeta: Meta<typeof DimensionCard> = {
  title: 'DataDisplay/DimensionCard',
  component: DimensionCard,
};

export const DimensionDefault: StoryObj<typeof DimensionCard> = {
  render: () => <DimensionCard dimension="health" label="Health" score={8.1} trend="up" />,
};

export const AllDimensions: StoryObj<typeof DimensionCard> = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
      {dimensions.map((d) => (
        <DimensionCard key={d.dimension} {...d} />
      ))}
    </div>
  ),
};

export const WithClickHandler: StoryObj<typeof DimensionCard> = {
  render: () => {
    return (
      <DimensionCard
        dimension="career"
        label="Career"
        score={7.2}
        trend="up"
        onClick={() => {}}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByText('Career').closest('[class*="hover-lift"]');
    await expect(card).toBeInTheDocument();
  },
};
