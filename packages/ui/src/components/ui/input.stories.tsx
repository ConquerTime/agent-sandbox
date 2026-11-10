import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Enter text...' },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password' },
};

export const File: Story = {
  args: { type: 'file' },
};

export const WithLabel: Story = {
  render: () => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">Email</span>
      <Input type="email" placeholder="you@example.com" />
    </label>
  ),
};

export const ErrorState: Story = {
  args: {
    placeholder: 'Invalid input',
    'aria-invalid': true,
    defaultValue: 'invalid@',
  },
};
