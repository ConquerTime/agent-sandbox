import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './label';
import { Switch } from './switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Switch />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => <Switch disabled />,
};

export const Checked: Story = {
  render: () => <Switch defaultChecked />,
};
