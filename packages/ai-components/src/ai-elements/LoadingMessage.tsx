import type { UIDataTypes, UIMessage, UITools } from 'ai';
import { useMemo } from 'react';
import { LoadingDots } from './loading-dots';
import { Message, MessageContent } from './message';

export const LoadingMessage = ({
  message,
  isLast = false,
  visible = false,
}: {
  message: UIMessage<unknown, UIDataTypes, UITools>;
  isLast?: boolean;
  visible?: boolean;
}) => {
  const hasPaddingTop = useMemo(() => {
    return (
      message.parts.length === 1 &&
      message.parts[0].type !== 'data-summarization'
    );
  }, [message.parts]);

  const hasBorderRadiusAndPaddingTop = useMemo(() => {
    return (
      message.parts.length === 1 &&
      message.parts[0].type !== 'data-summarization'
    );
  }, [message.parts]);

  const hasContainerPaddingTop = useMemo(() => {
    return (
      message.parts.length === 1 &&
      message.parts[0].type !== 'data-summarization'
    );
  }, [message.parts]);

  if (message.role !== 'assistant' || !isLast || !visible) {
    return null;
  }

  return (
    <Message
      from="assistant"
      hasPaddingTop={hasPaddingTop}
      hasPaddingBottom={true}
    >
      <MessageContent
        from={message.role}
        hasBorderRadiusAndPaddingTop={hasBorderRadiusAndPaddingTop}
        hasBorderRadiusAndPaddingBottom={true}
      >
        <div
          className="flex items-center gap-2 text-foreground/80"
          style={{ paddingTop: hasContainerPaddingTop ? 0 : 12 }}
        >
          <LoadingDots
            data-testid="chat-loading-dots"
            label="AI 正在输入"
            size="md"
          />
        </div>
      </MessageContent>
    </Message>
  );
};
