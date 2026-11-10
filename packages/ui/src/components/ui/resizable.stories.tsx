import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable';

const meta = {
  title: 'UI/Resizable',
  component: ResizablePanelGroup,
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function Panel({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center p-6">
      <span className="font-semibold">{label}</span>
    </div>
  );
}

export const Horizontal: Story = {
  args: { direction: 'horizontal', className: 'max-w-md rounded-lg border' },
  render: (args) => (
    <ResizablePanelGroup {...args}>
      <ResizablePanel defaultSize={50}>
        <Panel label="One" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <Panel label="Two" />
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const Vertical: Story = {
  args: { direction: 'vertical', className: 'max-w-md rounded-lg border' },
  render: (args) => (
    <ResizablePanelGroup {...args}>
      <ResizablePanel defaultSize={50}>
        <Panel label="One" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <Panel label="Two" />
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const WithHandle: Story = {
  args: { direction: 'horizontal', className: 'max-w-md rounded-lg border' },
  render: (args) => (
    <ResizablePanelGroup {...args}>
      <ResizablePanel defaultSize={50}>
        <Panel label="One" />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <Panel label="Two" />
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const ThreePanels: Story = {
  args: { direction: 'horizontal', className: 'max-w-md rounded-lg border' },
  render: (args) => (
    <ResizablePanelGroup {...args}>
      <ResizablePanel defaultSize={33}>
        <Panel label="One" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={33}>
        <Panel label="Two" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={34}>
        <Panel label="Three" />
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
