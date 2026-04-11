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
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};

export default preview;
