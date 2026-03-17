import type { Preview } from '@storybook/react';
import '../../../apps/web/src/app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FAFAF8' },
        { name: 'dark', value: '#1A1816' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
};

export default preview;
