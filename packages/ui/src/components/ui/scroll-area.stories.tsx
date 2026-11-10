import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { cn } from '../../lib/utils';
import { ScrollArea, ScrollBar } from './scroll-area';

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        {items.map((item) => (
          <div key={item} className="py-2">
            {item}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollAreaPrimitive.Root className="relative h-24 w-72 overflow-hidden rounded-md border">
      <ScrollAreaPrimitive.Viewport
        className={cn(
          'size-full rounded-[inherit] outline-none transition-[color,box-shadow]',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1'
        )}
      >
        <div className="flex w-max gap-4 p-4">
          {items.map((item) => (
            <div key={item} className="shrink-0">
              {item}
            </div>
          ))}
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  ),
};
