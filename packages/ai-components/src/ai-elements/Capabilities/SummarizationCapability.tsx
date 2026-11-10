import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import type { UIMessage, UITools } from 'ai';
import { WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

function useSummarizationCapability({
  parts,
}: UIMessage<unknown, RushUIDataTypes, UITools>) {
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    const lastPart = parts[parts.length - 1];

    if (isSummarizing && lastPart !== null) {
      setIsSummarizing(false);
    }

    if (
      lastPart.type === 'data-summarization' &&
      lastPart.data.conversationSummaryStarter
    ) {
      setIsSummarizing(true);
    }
  }, [isSummarizing, parts]);

  return {
    isSummarizing,
    setIsSummarizing,
  };
}

// 默认摘要消息文本
export const DEFAULT_SUMMARIZATION_MESSAGE = '聊天摘要已生成';

/**
 * Summarization Message Component
 * 摘要消息组件 - 在 conversation 中显示"正在摘要聊天上下文"的消息
 */
export const SummarizationMessage = ({
  message,
}: {
  message: UIMessage<unknown, RushUIDataTypes, UITools>;
}) => {
  const { isSummarizing } = useSummarizationCapability(message);

  return (
    <div
      className="flex items-center gap-1"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '4px',
        width: 'fit-content',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: '6px 0',
        marginLeft: '2px',
      }}
    >
      {/* 图标 - 使用 WandSparkles 图标 */}
      <WandSparkles
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          fontSize: '13px',
          color: 'text-gray-400',
          opacity: '0.6',
          width: '15px',
          height: '17px',
          justifyContent: 'flex-start',
          transition: 'opacity 0.1s ease-in',
          lineHeight: '16px',
          flexShrink: '0',
          transform: 'scaleX(-1)',
        }}
      />
      {/* 消息内容 */}
      {isSummarizing ? (
        <span
          className="animate-shimmer"
          style={{
            fontSize: '12px',
            opacity: '0.6',
            flex: '1',
            minWidth: '0',
            backgroundImage:
              'linear-gradient(90deg, rgba(156, 163, 175, 0.6) 0%, rgba(255, 255, 255, 1) 50%, rgba(156, 163, 175, 0.6) 100%)',
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          正在生成聊天摘要…
        </span>
      ) : (
        // 摘要完成后显示配置的消息
        <div
          className="text-muted-foreground"
          style={{
            fontSize: '12px',
            opacity: '0.6',
            transition: 'opacity 0.1s ease-in',
            minWidth: '0',
            lineHeight: '1.3',
            alignItems: 'flex-start',
          }}
        >
          {DEFAULT_SUMMARIZATION_MESSAGE}
        </div>
      )}
    </div>
  );
};
