import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Textarea />,
};

export const WithPlaceholder: Story = {
  render: () => <Textarea placeholder="Type your message here..." />,
};

export const Disabled: Story = {
  render: () => <Textarea disabled placeholder="Disabled" />,
};

export const ErrorState: Story = {
  render: () => (
    <Textarea
      aria-invalid="true"
      placeholder="Invalid input"
      defaultValue="Invalid value"
    />
  ),
};
