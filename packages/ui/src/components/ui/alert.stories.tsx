import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'default' },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Alert>
      <CircleAlert className="h-4 w-4" />
      <AlertTitle>Notice</AlertTitle>
      <AlertDescription>
        This alert includes an icon for visual emphasis.
      </AlertDescription>
    </Alert>
  ),
};
