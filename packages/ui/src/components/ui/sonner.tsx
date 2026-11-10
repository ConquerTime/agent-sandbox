'use client';

import { cn } from '@cortex/ui/utils';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={props.theme ?? 'system'}
      className={cn('toaster group z-[100]', className)}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(
            'group toast z-[101] group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            toastOptions?.classNames?.toast
          ),
          description: cn(
            'group-[.toast]:text-muted-foreground',
            toastOptions?.classNames?.description
          ),
          actionButton: cn(
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            toastOptions?.classNames?.actionButton
          ),
          cancelButton: cn(
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
            toastOptions?.classNames?.cancelButton
          ),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
