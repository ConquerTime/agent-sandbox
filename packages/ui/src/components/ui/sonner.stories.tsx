import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';
import { Button } from './button';
import { Toaster } from './sonner';

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        onClick={() => {
          toast('Event created');
        }}
      >
        Show Toast
      </Button>
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Toaster />
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            toast.success('Successfully saved!');
          }}
        >
          Success Toast
        </Button>
        <Button
          onClick={() => {
            toast.error('Something went wrong');
          }}
        >
          Error Toast
        </Button>
        <Button
          onClick={() => {
            toast.info('New update available');
          }}
        >
          Info Toast
        </Button>
        <Button
          onClick={() => {
            toast.warning('Please check your input');
          }}
        >
          Warning Toast
        </Button>
      </div>
    </div>
  ),
};
