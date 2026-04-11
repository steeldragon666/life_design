import type { Meta, StoryObj } from '@storybook/react';
import { LottieAnimation } from '../components/LottieAnimation';

// Minimal mock animation data (a simple circle)
const mockAnimationData = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  layers: [
    {
      ty: 4,
      nm: 'Circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100, 100] }, { t: 60, s: [120, 120, 100] }] },
      },
      shapes: [
        {
          ty: 'el',
          d: 1,
          s: { a: 0, k: [80, 80] },
          p: { a: 0, k: [0, 0] },
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.353, 0.498, 0.353, 1] },
          o: { a: 0, k: 100 },
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

const meta: Meta<typeof LottieAnimation> = {
  title: 'Components/LottieAnimation',
  component: LottieAnimation,
};

export default meta;
type Story = StoryObj<typeof LottieAnimation>;

export const Default: Story = {
  args: {
    animationData: mockAnimationData,
    className: 'w-48 h-48',
  },
};

export const NoLoop: Story = {
  args: {
    animationData: mockAnimationData,
    loop: false,
    className: 'w-48 h-48',
  },
};
