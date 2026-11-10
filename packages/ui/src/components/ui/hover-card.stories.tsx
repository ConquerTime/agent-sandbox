import type { Meta, StoryObj } from '@storybook/react-vite';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

const meta = {
  title: 'UI/HoverCard',
  component: HoverCard,
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href="#" className="text-sm font-medium underline">
          Hover me
        </a>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-1">
          <p className="text-sm font-semibold">@shadcn</p>
          <p className="text-sm text-muted-foreground">
            The creator of shadcn/ui. Building design systems.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
