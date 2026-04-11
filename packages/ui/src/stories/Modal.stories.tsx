import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Confirm Action',
    children: 'Are you sure you want to proceed?',
    footer: <><Button variant="secondary">Cancel</Button><Button>Confirm</Button></>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole('dialog');
    await expect(dialog.getAttribute('aria-modal')).toBe('true');
    const closeBtn = canvas.getByLabelText('Close');
    await expect(closeBtn).toHaveClass('cursor-pointer');
  },
};
