import { cn } from '@cortex/ui';
import type { ChatStatus, UIDataTypes, UIMessage, UITools } from 'ai';
import type React from 'react';

export const Tool = ({
  message,
  index,
  status,
  isLastMessage,
  hasBackground = false,
  hasBorder = true,
  children,
}: {
  message: UIMessage<unknown, UIDataTypes, UITools>;
  index: number;
  status: ChatStatus;
  isLastMessage?: boolean;
  /** 为工具块使用背景色 */
  hasBackground?: boolean;
  /** 是否展示边框，默认 true */
  hasBorder?: boolean;
  children?: React.ReactNode;
}) => {
  const hasPaddingTop = message.role === 'assistant' && index === 1;
  const hasPaddingBottom =
    message.role === 'assistant' &&
    index === message.parts.length - 1 &&
    (isLastMessage ? status !== 'streaming' : true);

  return (
    <div
      className={cn({
        'mt-4 pt-3 rounded-t-lg': hasPaddingTop,
        'mb-4 pb-3 rounded-b-lg': hasPaddingBottom,
      })}
    >
      {hasBackground ? (
        <div
          className={cn(
            'rounded-md bg-card',
            hasBorder && 'border border-border'
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
};
