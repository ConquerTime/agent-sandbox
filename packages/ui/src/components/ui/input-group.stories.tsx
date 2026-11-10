import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, X } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from './input-group';

const meta = {
  title: 'UI/InputGroup',
  component: InputGroup,
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPrefix: Story = {
  render: () => (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search..." />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="example.com" />
      </InputGroup>
    </div>
  ),
};

export const WithSuffix: Story = {
  render: () => (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon align="inline-end">
          <Search />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter amount" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const WithButton: Story = {
  render: () => (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>
            <Search />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter email" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="ghost" size="xs">
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="block-start">
        <InputGroupText>Notes</InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Enter your notes here..." rows={4} />
    </InputGroup>
  ),
};
