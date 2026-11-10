import { getFileNameAndTypeFromPath } from '@cortex/shared/lib/tool';
import type {
  ChatStatus,
  ToolUIPart,
  UIDataTypes,
  UIMessagePart,
  UITools,
} from 'ai';
import get from 'lodash/get';
import { Loader2Icon } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Tool, ToolContent, ToolHeader, ToolInput } from '../tool';
import { getCodeRenderStrategy } from './tool-render-perf-utils';

type WriteToolProps = {
  part: UIMessagePart<UIDataTypes, UITools>;
  isLastPartInLastMessage?: boolean;
  status?: ChatStatus;
  isLastMessage: boolean;
};

export const WriteTool = memo(function WriteTool({
  part,
  status,
  isLastMessage,
  isLastPartInLastMessage = false,
}: WriteToolProps) {
  const typedPart = part as ToolUIPart<UITools>;
  const filePath = get(
    typedPart,
    'input.file_path',
    get(typedPart, 'input.path', '')
  ) as string;
  const { fileName, fileType } = getFileNameAndTypeFromPath(filePath);
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const [defaultOpen, setDefaultOpen] = useState(false);

  const isPending =
    (typedPart.state === 'input-streaming' ||
      typedPart.state === 'input-available') &&
    status === 'streaming' &&
    isLastMessage;
  const isError = typedPart.state === 'output-error';

  const content: string = get(typedPart, 'input.content', '');

  const strategy = useMemo(() => getCodeRenderStrategy(content), [content]);

  useEffect(() => {
    if (!isLastPartInLastMessage) {
      return;
    }
    if (status === 'streaming') {
      setOpen(true);
    } else if (status === 'error') {
      setDefaultOpen(true);
      setOpen(undefined);
    }
    setOpen(undefined);
  }, [status, isLastPartInLastMessage]);

  if (isPending) {
    return (
      <div className="py-1 px-4">
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          <div className="flex flex-1 flex-col items-start gap-0.5">
            <span className="font-medium text-sm text-foreground">
              {fileName || '正在创建文件...'}
            </span>
            <span className="text-xs text-muted-foreground">写入中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-1 px-4">
      <Tool open={open} defaultOpen={defaultOpen || isError}>
        <ToolHeader
          hasBackground
          title={fileName}
          type={typedPart.type}
          state={typedPart.state}
        />
        <ToolContent>
          <WriteContent
            content={content}
            input={typedPart.input}
            language={fileType || 'text'}
            strategy={strategy}
          />
        </ToolContent>
      </Tool>
    </div>
  );
}, areWriteToolPropsEqual);

function areWriteToolPropsEqual(prev: WriteToolProps, next: WriteToolProps) {
  const prevPart = prev.part as ToolUIPart<UITools>;
  const nextPart = next.part as ToolUIPart<UITools>;
  return (
    prevPart.state === nextPart.state &&
    prevPart.input === nextPart.input &&
    prev.status === next.status
  );
}

function WriteContent({
  content,
  input,
  language,
  strategy,
}: {
  content: string;
  input: unknown;
  language: string;
  strategy: ReturnType<typeof getCodeRenderStrategy>;
}) {
  if (strategy === 'summary') {
    const lineCount = content ? content.split('\n').length : 0;
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span>大文件</span>
        <span>{lineCount} 行</span>
      </div>
    );
  }

  if (strategy === 'plain') {
    return (
      <div className="space-y-2 overflow-hidden">
        <pre className="m-0 overflow-auto bg-transparent px-4 py-2 font-mono text-xs leading-5 text-foreground whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <ToolInput input={input} language={language}>
      {content}
    </ToolInput>
  );
}
