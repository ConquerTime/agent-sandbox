import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from './field';
import { Input } from './input';

const meta = {
  title: 'UI/Field',
  component: Field,
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal', 'responsive'],
    },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <FieldContent>
          <Input id="email" type="email" placeholder="name@example.com" />
          <FieldDescription>
            Enter your email address to receive updates.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <FieldGroup>
      <Field data-invalid>
        <FieldLabel htmlFor="email-error">Email</FieldLabel>
        <FieldContent>
          <Input
            id="email-error"
            type="email"
            placeholder="name@example.com"
            aria-invalid="true"
          />
          <FieldError
            errors={[{ message: 'Please enter a valid email address.' }]}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="email-horizontal">Email</FieldLabel>
        <FieldContent>
          <Input
            id="email-horizontal"
            type="email"
            placeholder="name@example.com"
          />
          <FieldDescription>
            Enter your email address to receive updates.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const FieldSetExample: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Account Information</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <FieldContent>
            <Input id="name" type="text" placeholder="John Doe" />
          </FieldContent>
        </Field>
        <FieldSeparator />
        <Field>
          <FieldLabel htmlFor="email-fieldset">Email</FieldLabel>
          <FieldContent>
            <Input
              id="email-fieldset"
              type="email"
              placeholder="name@example.com"
            />
            <FieldDescription>
              We'll never share your email with anyone else.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
