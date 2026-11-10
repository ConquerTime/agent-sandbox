'use client';

import { cn } from '@cortex/ui';
import { Button } from '@cortex/ui/components/ui/button';
import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import {
  ScrollableDiv,
  type ScrollableDivType,
} from './ScrollableDiv/ScrollableDiv';
import { useScrollContext } from './ScrollableDiv/scrollContext';

export type ConversationProps = ComponentProps<'div'>;

export const Conversation = (
  props: Omit<ScrollableDivType, 'loadMoreThreshold'>
) => <ScrollableDiv {...props} loadMoreThreshold={200} />;

export type ConversationContentProps = ComponentProps<'div'>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <div className={cn('p-4', className)} {...props} />
);

export type ConversationEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = 'No messages yet',
  description = 'Start a conversation to see messages here',
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  isAtBottom?: boolean;
  onScrollToBottom?: () => void;
};

export const ConversationScrollButton = ({
  className,
}: ConversationScrollButtonProps) => {
  const { scrollState, scrollToBottom } = useScrollContext();
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !scrollState.isAtBottom && (
      <Button
        className={cn(
          'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full cursor-pointer',
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
