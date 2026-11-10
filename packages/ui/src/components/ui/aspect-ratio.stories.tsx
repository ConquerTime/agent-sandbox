import type { Meta, StoryObj } from '@storybook/react-vite';
import { AspectRatio } from './aspect-ratio';

const meta = {
  title: 'UI/AspectRatio',
  component: AspectRatio,
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AspectRatio ratio={16 / 9} className="bg-muted">
      <img
        src="https://images.unsplash.com/photo-1586348943529-be31ae737f6a?w=800&h=450&fit=crop"
        alt="Placeholder"
        className="h-full w-full object-cover"
      />
    </AspectRatio>
  ),
};

export const Square: Story = {
  render: () => (
    <AspectRatio ratio={1} className="bg-muted">
      <img
        src="https://images.unsplash.com/photo-1586348943529-be31ae737f6a?w=400&h=400&fit=crop"
        alt="Square"
        className="h-full w-full object-cover"
      />
    </AspectRatio>
  ),
};

export const Widescreen: Story = {
  render: () => (
    <AspectRatio ratio={21 / 9} className="bg-muted">
      <img
        src="https://images.unsplash.com/photo-1586348943529-be31ae737f6a?w=840&h=360&fit=crop"
        alt="Widescreen"
        className="h-full w-full object-cover"
      />
    </AspectRatio>
  ),
};
