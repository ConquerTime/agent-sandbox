import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, KbdGroup } from './kbd';

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => <Kbd>⌘</Kbd>,
};

export const Combo: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <span>+</span>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

export const AllModifiers: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Kbd>⌘</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>⌃</Kbd>
      <Kbd>⇧</Kbd>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <span>+</span>
        <Kbd>K</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>⌃</Kbd>
        <span>+</span>
        <Kbd>C</Kbd>
      </KbdGroup>
    </div>
  ),
};
