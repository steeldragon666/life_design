import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../components/Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    status: { control: 'select', options: ['online', 'offline', 'busy'] },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    alt: 'Jane Doe',
    size: 'md',
  },
};

export const Initials: Story = {
  args: { alt: 'Jane Doe', size: 'md' },
};

export const WithStatus: Story = {
  args: {
    alt: 'Jane Doe',
    status: 'online',
    size: 'md',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar alt="Jane Doe" size="sm" />
      <Avatar alt="Jane Doe" size="md" />
      <Avatar alt="Jane Doe" size="lg" />
      <Avatar alt="Jane Doe" size="xl" />
    </div>
  ),
};
