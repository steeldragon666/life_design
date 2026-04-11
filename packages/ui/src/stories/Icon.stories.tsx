import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../components/Icon';
import {
  CareerIcon,
  FinanceIcon,
  HealthIcon,
  FitnessIcon,
  FamilyIcon,
  SocialIcon,
  RomanceIcon,
  GrowthIcon,
} from '../components/icons/dimensions';

const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: { icon: ChevronLeft },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = canvasElement.querySelector('svg');
    await expect(svg).toBeTruthy();
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Icon icon={ChevronLeft} size="sm" />
      <Icon icon={ChevronLeft} size="md" />
      <Icon icon={ChevronLeft} size="lg" />
    </div>
  ),
};

export const AllDimensions: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <CareerIcon />
      <FinanceIcon />
      <HealthIcon />
      <FitnessIcon />
      <FamilyIcon />
      <SocialIcon />
      <RomanceIcon />
      <GrowthIcon />
    </div>
  ),
};
