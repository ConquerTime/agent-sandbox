import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="text-sm">Content above</div>
      <Separator />
      <div className="text-sm">Content below</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center gap-4">
      <div className="text-sm">Left</div>
      <Separator orientation="vertical" />
      <div className="text-sm">Right</div>
    </div>
  ),
};
