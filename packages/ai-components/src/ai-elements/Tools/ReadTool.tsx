import { getFileNameAndTypeFromPath } from '@cortex/shared/lib/tool';
import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import { cn } from '@cortex/ui';
import * as Tooltip from '@radix-ui/react-tooltip';
import type {
  ToolUIPart,
  UIDataTypes,
  UIMessage,
  UIMessagePart,
  UITools,
} from 'ai';
import get from 'lodash/get';
import { memo } from 'react';
import { FileCard, findOssFile } from './shared/file-card';

const ReadToolPartState = {
  OUTPUT_AVAILABLE: 'output-available',
  OUTPUT_ERROR: 'output-error',
} as const;

type ReadToolProps = {
  part: UIMessagePart<UIDataTypes, UITools>;
  message?: UIMessage<unknown, RushUIDataTypes, UITools>;
  onFileClick?: (params: { filePath: string; ossPath?: string }) => void;
};

export const ReadTool = memo(
  function ReadTool({ part, message, onFileClick }: ReadToolProps) {
    const filePath = get(part, 'input.file_path', get(part, 'input.path', ''));
    const { fileName } = getFileNameAndTypeFromPath(filePath);
    const state = get(part, 'state', ReadToolPartState.OUTPUT_AVAILABLE);
    const toolCallId = get(part, 'toolCallId');

    const ossFile = findOssFile(message, toolCallId);

    const isError = state === ReadToolPartState.OUTPUT_ERROR;
    const isCompleted = state === ReadToolPartState.OUTPUT_AVAILABLE;

    // 已完成且有 OSS 信息：显示文件卡片
    if (isCompleted && ossFile) {
      return (
        <FileCard
          fileName={fileName}
          statusText="文件已读取并上传"
          onClick={
            onFileClick
              ? () => onFileClick({ filePath, ossPath: ossFile?.ossPath })
              : undefined
          }
        />
      );
    }

    // 错误状态或普通读取：显示简洁的文本
    const text = isError
      ? `Could not find file ${filePath} in the workspace`
      : fileName;
    const tooltipContent = text;

    return (
      <div className={cn('px-4 py-1', 'text-muted-foreground')}>
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              {isError ? (
                <p
                  className={cn(
                    'truncate font-medium text-xs cursor-default text-gray-400'
                  )}
                >
                  {text}
                </p>
              ) : (
                <div
                  className={cn(
                    'flex gap-1 font-medium text-xs w-fit max-w-full'
                  )}
                >
                  Read
                  <p className={cn('truncate text-gray-400')}>{text}</p>
                </div>
              )}
            </Tooltip.Trigger>
            <Tooltip.Content
              className="bg-popover border border-border p-1.5 rounded-md font-medium text-xs max-w-xs break-all"
              style={{ color: 'var(--foreground)' }}
              sideOffset={4}
            >
              {tooltipContent}
              <Tooltip.Arrow className="fill-popover" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return (
      prevPart === nextPart &&
      prevPart.state === nextPart.state &&
      prev.message === next.message
    );
  }
);
