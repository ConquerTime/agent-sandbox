'use client';

import { getFileNameAndTypeFromPath } from '@cortex/shared/lib/tool';
import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import get from 'lodash/get';
import { memo, useMemo, useState } from 'react';
import { DiffCodeBlock } from '../diff-code-block';
import { Tool, ToolContent, ToolHeader, ToolInput } from '../tool';
import {
  computeDiffStats,
  getDiffRenderStrategy,
} from './tool-render-perf-utils';

type EditToolProps = {
  part: UIMessagePart<UIDataTypes, UITools>;
};

export const EditTool = memo(function EditTool({ part }: EditToolProps) {
  const [visibleToolContent, setVisibleToolContent] = useState(false);

  const typedPart = part as ToolUIPart<UITools>;
  const { fileName, fileType } = getFileNameAndTypeFromPath(
    get(typedPart, 'input.file_path', get(typedPart, 'input.path', ''))
  );

  const oldStringRaw = get(typedPart, 'input.old_string');
  const newStringRaw = get(typedPart, 'input.new_string');
  const oldString = typeof oldStringRaw === 'string' ? oldStringRaw : '';
  const newString = typeof newStringRaw === 'string' ? newStringRaw : '';

  // 单边为空字符串也应该按 diff 处理（新增/删除场景）
  const hasDiff = oldStringRaw !== undefined || newStringRaw !== undefined;

  const strategy = useMemo(
    () => (hasDiff ? getDiffRenderStrategy(oldString, newString) : 'full'),
    [hasDiff, oldString, newString]
  );

  const diffStats = useMemo(
    () => (hasDiff ? computeDiffStats(oldString, newString) : null),
    [hasDiff, oldString, newString]
  );

  return (
    <div className="py-1 px-4">
      <Tool
        defaultOpen={false}
        onOpenChange={(open) => {
          setVisibleToolContent(open);
        }}
      >
        <ToolHeader
          title={fileName}
          hasBackground
          type={typedPart.type}
          state={typedPart.state}
        />
        <ToolContent
          style={!visibleToolContent ? { height: 0, overflowY: 'hidden' } : {}}
        >
          {hasDiff ? (
            <DiffContent
              oldCode={oldString}
              newCode={newString}
              language={fileType || 'text'}
              strategy={strategy}
              diffStats={diffStats}
            />
          ) : (
            <ToolInput input={typedPart.input} language={fileType}>
              {get(typedPart, 'input.content', '')}
            </ToolInput>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}, areEditToolPropsEqual);

function areEditToolPropsEqual(prev: EditToolProps, next: EditToolProps) {
  const prevPart = prev.part as ToolUIPart<UITools>;
  const nextPart = next.part as ToolUIPart<UITools>;
  return prevPart.state === nextPart.state && prevPart.input === nextPart.input;
}

function DiffContent({
  oldCode,
  newCode,
  language,
  strategy,
  diffStats,
}: {
  oldCode: string;
  newCode: string;
  language: string;
  strategy: ReturnType<typeof getDiffRenderStrategy>;
  diffStats: ReturnType<typeof computeDiffStats> | null;
}) {
  if (strategy === 'summary') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span>大文件变更</span>
        {diffStats && (
          <>
            <span className="text-green-600">+{diffStats.addedNum}</span>
            <span className="text-red-600">-{diffStats.removedNum}</span>
          </>
        )}
      </div>
    );
  }

  const isPlain = strategy === 'plain';

  return (
    <div className="space-y-2 overflow-hidden">
      <DiffCodeBlock
        className="bg-background"
        oldCode={oldCode}
        newCode={newCode}
        language={language}
        splitView={false}
        showDiffOnly={isPlain}
        renderMode={isPlain ? 'plain' : 'syntax'}
      />
    </div>
  );
}
