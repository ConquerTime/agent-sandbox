import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline">Toggle</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        <div className="rounded-md border p-4">
          <p className="text-sm">
            This is collapsible content that can be expanded or collapsed.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="outline">Toggle</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        <div className="rounded-md border p-4">
          <p className="text-sm">This content is open by default.</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};
