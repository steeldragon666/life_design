import type { Meta, StoryObj } from '@storybook/react';
import { DashboardShell } from '../dashboard/DashboardShell';
import { DimensionGrid } from '../dashboard/DimensionGrid';
import { InsightFeed } from '../dashboard/InsightFeed';

/* ---------- DashboardShell ---------- */

const shellMeta: Meta<typeof DashboardShell> = {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
};

export default shellMeta;
type ShellStory = StoryObj<typeof DashboardShell>;

export const Default: ShellStory = {
  args: {
    nav: <div className="px-4 py-3 bg-white border-b text-sm font-semibold">Nav Bar</div>,
    children: <p className="text-stone-600">Main content area</p>,
  },
};

export const WithSidebar: ShellStory = {
  args: {
    nav: <div className="px-4 py-3 bg-white border-b text-sm font-semibold">Nav Bar</div>,
    sidebar: (
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">Menu</p>
        <p className="text-sm text-stone-500">Dashboard</p>
        <p className="text-sm text-stone-500">Settings</p>
      </div>
    ),
    children: <p className="text-stone-600">Main content with sidebar</p>,
  },
};

/* ---------- DimensionGrid ---------- */

const sampleDimensions = [
  { name: 'health', label: 'Health', score: 7.5, trend: 'up' as const },
  { name: 'career', label: 'Career', score: 8.0, trend: 'down' as const },
  { name: 'finance', label: 'Finance', score: 6.0, trend: 'flat' as const },
  { name: 'social', label: 'Social', score: 7.0 },
];

export const Grid: StoryObj<typeof DimensionGrid> = {
  render: () => <DimensionGrid dimensions={sampleDimensions} />,
  name: 'DimensionGrid',
};

/* ---------- InsightFeed ---------- */

const sampleInsights = [
  { id: '1', title: 'Health trending up', body: 'Your health score has improved by 0.5 points over the past week. Keep up the great work!', dimension: 'health', timestamp: '2 hours ago' },
  { id: '2', title: 'Career milestone', body: 'You completed 3 career goals this month, which is above your average.', dimension: 'career', timestamp: '1 day ago' },
  { id: '3', title: 'Finance check-in', body: 'Consider reviewing your savings targets for next quarter.', dimension: 'finance', timestamp: '3 days ago' },
];

export const Feed: StoryObj<typeof InsightFeed> = {
  render: () => <InsightFeed insights={sampleInsights} />,
  name: 'InsightFeed',
};
