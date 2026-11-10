import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="pt-2">Account settings and profile information.</p>
      </TabsContent>
      <TabsContent value="password">
        <p className="pt-2">Change your password here.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="pt-2">Manage your preferences.</p>
      </TabsContent>
    </Tabs>
  ),
};
