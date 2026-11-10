import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './carousel';

const SLIDES = ['Slide 1', 'Slide 2', 'Slide 3', 'Slide 4', 'Slide 5'];

const meta = {
  title: 'UI/Carousel',
  component: Carousel,
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel>
        <CarouselContent>
          {SLIDES.map((label) => (
            <CarouselItem key={label}>
              <div className="flex items-center justify-center h-48 bg-muted rounded-md">
                <span className="text-4xl font-semibold">{label}</span>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel orientation="vertical" className="h-96">
        <CarouselContent className="-mt-1 h-full">
          {SLIDES.map((label) => (
            <CarouselItem key={label} className="pt-1">
              <div className="flex items-center justify-center h-48 bg-muted rounded-md">
                <span className="text-4xl font-semibold">{label}</span>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
