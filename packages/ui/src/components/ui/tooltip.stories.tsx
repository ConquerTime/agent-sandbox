import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tooltip content</p>
      </TooltipContent>
    </Tooltip>
  ),
};
