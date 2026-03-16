import type { Meta, StoryObj } from '@storybook/react';
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
};
