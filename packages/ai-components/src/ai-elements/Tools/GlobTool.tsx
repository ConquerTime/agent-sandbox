import { cn } from '@cortex/ui';
import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import get from 'lodash/get';
import { memo } from 'react';

const ReadToolPartState = {
  OUTPUT_AVAILABLE: 'output-available',
  OUTPUT_ERROR: 'output-error',
} as const;

export type ReadToolPartStateType =
  (typeof ReadToolPartState)[keyof typeof ReadToolPartState];

export const GlobTool = memo(
  function GlobTool({ part }: { part: UIMessagePart<UIDataTypes, UITools> }) {
    return (
      <div
        className={cn(
          'flex gap-1 px-4 py-1',
          'text-muted-foreground',
          'cursor-pointer font-medium text-xs'
        )}
      >
        Searched files
        {/* TODO: 支持 hover 时展示匹配方法右侧的箭头，展开前后的方向需要变化 */}
        {/* TODO: 支持点击匹配方法后展开 output 列表 */}
        <p className={cn(' cursor-pointer text-gray-400')}>
          {get(part, 'input.pattern', '')}
        </p>
      </div>
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return prevPart === nextPart && prevPart.state === nextPart.state;
  }
);
