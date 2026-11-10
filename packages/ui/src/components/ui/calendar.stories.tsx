import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from './calendar';

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <Calendar mode="single" selected={date} onSelect={setDate} />;
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    return <Calendar mode="range" selected={range} onSelect={setRange} />;
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    return <Calendar mode="multiple" selected={dates} onSelect={setDates} />;
  },
};

export const WithoutOutsideDays: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        showOutsideDays={false}
      />
    );
  },
};
