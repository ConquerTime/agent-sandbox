import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreVertical, Settings, User } from 'lucide-react';
import { Button } from './button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item';

const meta = {
  title: 'UI/Item',
  component: Item,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'muted'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Item Title</ItemTitle>
          <ItemDescription>This is a description of the item.</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>Another Item</ItemTitle>
          <ItemDescription>Another description here.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const WithMedia: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemMedia variant="icon">
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>User Profile</ItemTitle>
          <ItemDescription>
            View and edit your profile settings.
          </ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Settings />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Settings</ItemTitle>
          <ItemDescription>
            Configure your application preferences.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const WithActions: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Item with Actions</ItemTitle>
          <ItemDescription>This item has action buttons.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            <MoreVertical />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>Another Item</ItemTitle>
          <ItemDescription>With actions too.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};

export const Variants: Story = {
  render: () => (
    <ItemGroup>
      <Item variant="default">
        <ItemContent>
          <ItemTitle>Default Variant</ItemTitle>
          <ItemDescription>Transparent background.</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Outline Variant</ItemTitle>
          <ItemDescription>With border.</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Muted Variant</ItemTitle>
          <ItemDescription>With muted background.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const Small: Story = {
  render: () => (
    <ItemGroup>
      <Item size="sm">
        <ItemMedia variant="icon">
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Small Item</ItemTitle>
          <ItemDescription>Compact size variant.</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item size="sm">
        <ItemMedia variant="icon">
          <Settings />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Another Small Item</ItemTitle>
          <ItemDescription>With reduced padding.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
