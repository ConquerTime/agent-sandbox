'use client';

import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import type { ChatStatus, UIMessage, UIMessagePart, UITools } from 'ai';
import { ChevronRightIcon, WrenchIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { PartRenderer } from '../parts/part-renderer';
import type { OnWebdevInitPreviewClick, ToolRegistry } from './tool-registry';

export interface ToolGroupSummaryProps {
  toolParts: UIMessagePart<RushUIDataTypes, UITools>[];
  message: UIMessage<unknown, RushUIDataTypes, UITools>;
  status: ChatStatus;
  isLastMessage: boolean;
  toolRegistry?: ToolRegistry;
  onFileClick?: (params: { filePath: string; ossPath?: string }) => void;
  onWebdevInitPreviewClick?: OnWebdevInitPreviewClick;
  onScaffoldAutoOpenPreview?: () => void;
}

export const ToolGroupSummary = memo(
  function ToolGroupSummary({
    toolParts,
    message,
    status,
    isLastMessage,
    toolRegistry,
    onFileClick,
    onWebdevInitPreviewClick,
    onScaffoldAutoOpenPreview,
  }: ToolGroupSummaryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isExpanded) {
      return (
        <div>
          <button
            type="button"
            aria-expanded={true}
            className="flex w-full items-center gap-1 px-5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronRightIcon className="size-3.5 rotate-90 transition-transform" />
            <span>收起 {toolParts.length} 个工具调用</span>
          </button>
          {toolParts.map((part, i) => (
            <PartRenderer
              key={`${message.id}-tool-group-${i}`}
              part={part}
              message={message}
              index={i}
              status={status}
              isLastMessage={isLastMessage}
              toolRegistry={toolRegistry}
              onFileClick={onFileClick}
              onWebdevInitPreviewClick={onWebdevInitPreviewClick}
              onScaffoldAutoOpenPreview={onScaffoldAutoOpenPreview}
            />
          ))}
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-expanded={false}
        className="flex w-full items-center gap-1.5 px-5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <WrenchIcon className="size-3.5" />
        <span>执行了 {toolParts.length} 个工具调用</span>
        <ChevronRightIcon className="size-3.5 transition-transform" />
      </button>
    );
  },
  (prev, next) => {
    if (prev.toolParts.length !== next.toolParts.length) return false;
    for (let i = 0; i < prev.toolParts.length; i++) {
      if (prev.toolParts[i] !== next.toolParts[i]) return false;
    }
    return (
      prev.message === next.message &&
      prev.status === next.status &&
      prev.isLastMessage === next.isLastMessage
    );
  }
);
