'use client';

import { ChevronRightIcon, MessageSquareIcon } from 'lucide-react';
import { memo, type ReactNode, useState } from 'react';

const MAX_SUMMARY_LENGTH = 50;

function extractUserText(
  parts: Array<{ type: string; text?: string }>
): string {
  for (const part of parts) {
    if (part.type === 'text' && part.text) {
      const text = part.text.trim();
      if (text.length > MAX_SUMMARY_LENGTH) {
        return `${text.slice(0, MAX_SUMMARY_LENGTH)}…`;
      }
      return text;
    }
  }
  return '(消息)';
}

export interface CollapsedTurnProps {
  userParts?: Array<{ type: string; text?: string }>;
  children: ReactNode;
}

export const CollapsedTurn = memo(function CollapsedTurn({
  userParts,
  children,
}: CollapsedTurnProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div>
        <button
          type="button"
          aria-expanded={true}
          className="flex w-full items-center gap-1.5 px-5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronRightIcon className="size-3.5 rotate-90 transition-transform" />
          <span>收起本轮对话</span>
        </button>
        {children}
      </div>
    );
  }

  const summary = userParts ? extractUserText(userParts) : '(对话)';

  return (
    <button
      type="button"
      aria-expanded={false}
      className="flex w-full items-center gap-1.5 px-5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => setIsExpanded(true)}
    >
      <MessageSquareIcon className="size-3.5" />
      <span className="truncate text-left">{summary}</span>
      <ChevronRightIcon className="size-3.5 flex-shrink-0 transition-transform" />
    </button>
  );
});
