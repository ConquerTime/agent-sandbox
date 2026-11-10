'use client';

import { toggleVariants } from '@cortex/ui/components/ui/toggle';
import { cn } from '@cortex/ui/utils';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
  }
>({
  size: 'default',
  variant: 'default',
  spacing: 0,
});

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
  }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-spacing={spacing}
      className={cn(
        'group/toggle-group flex items-center data-[spacing=0]:rounded-md',
        spacing === 0 && 'gap-0',
        spacing > 0 && 'gap-1',
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-spacing={context.spacing}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        'data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:border-x-0 first:data-[spacing=0]:rounded-s-md first:data-[spacing=0]:border-l last:data-[spacing=0]:rounded-e-md last:data-[spacing=0]:border-r not-first:data-[spacing=0]:border-l',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
