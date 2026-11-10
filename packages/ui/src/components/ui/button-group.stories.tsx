import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from './button-group';

const meta = {
  title: 'UI/ButtonGroup',
  component: ButtonGroup,
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ButtonGroup orientation="horizontal">
      <Button variant="outline">First</Button>
      <Button variant="outline">Second</Button>
      <Button variant="outline">Third</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">First</Button>
      <Button variant="outline">Second</Button>
      <Button variant="outline">Third</Button>
    </ButtonGroup>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup orientation="horizontal">
      <Button variant="outline">First</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Second</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Third</Button>
    </ButtonGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <ButtonGroup orientation="horizontal">
      <ButtonGroupText>Label:</ButtonGroupText>
      <Button variant="outline">Action</Button>
      <Button variant="outline">Action</Button>
    </ButtonGroup>
  ),
};
