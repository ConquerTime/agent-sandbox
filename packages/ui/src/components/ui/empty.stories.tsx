import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileQuestion } from 'lucide-react';
import { Button } from './button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty';

const meta = {
  title: 'UI/Empty',
  component: Empty,
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>No items found</EmptyTitle>
        <EmptyDescription>Get started by creating a new item.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>No items found</EmptyTitle>
        <EmptyDescription>Get started by creating a new item.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create Item</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const IconVariant: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="default">
          <FileQuestion className="size-12" />
        </EmptyMedia>
        <EmptyTitle>No items found</EmptyTitle>
        <EmptyDescription>Get started by creating a new item.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
