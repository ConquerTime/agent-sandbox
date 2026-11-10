'use client';

import { cn } from '@cortex/ui';
import { Badge } from '@cortex/ui/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cortex/ui/components/ui/collapsible';
import type { ToolUIPart } from 'ai';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClipboardListIcon,
  ClockIcon,
  CodeIcon,
  FileTextIcon,
  GlobeIcon,
  PencilIcon,
  TerminalIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { memo } from 'react';
import { CodeBlock } from './code-block';
import { getCodeRenderStrategy } from './Tools/tool-render-perf-utils';

export type ToolProps = ComponentProps<typeof Collapsible> & {
  hasBackground?: boolean;
};

// 根据工具类型返回相应的图标
const getToolIcon = (type: string) => {
  switch (type) {
    case 'tool-Grep':
    case 'tool-Bash':
      return <TerminalIcon className="size-4 text-muted-foreground" />;
    case 'tool-WebFetch':
      return <GlobeIcon className="size-4 text-muted-foreground" />;
    case 'tool-Read':
      return <FileTextIcon className="size-4 text-muted-foreground" />;
    case 'tool-Write':
      return <CodeIcon className="size-4 text-muted-foreground" />;
    case 'tool-Edit':
      return <PencilIcon className="size-4 text-muted-foreground" />;
    case 'tool-LS':
      return <FileTextIcon className="size-4 text-muted-foreground" />;
    case 'tool-TodoWrite':
      return <ClipboardListIcon className="size-4 text-muted-foreground" />;
    default:
      return <WrenchIcon className="size-4 text-muted-foreground" />;
  }
};

export const Tool = ({
  className,
  hasBackground = false,
  ...props
}: ToolProps) => (
  <Collapsible
    className={cn(
      'not-prose w-full rounded-md border',
      hasBackground && 'bg-muted/50',
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  subTitle?: ReactNode;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
  showBadge?: boolean;
  /** 为 header 区域使用背景色，与 Tool 的 hasBackground 搭配使用 */
  hasBackground?: boolean;
};

export const getStatusBadge = (status: ToolUIPart['state']) => {
  // AI SDK v6 新增了 approval-requested, approval-responded, output-denied 状态
  const labels: Record<ToolUIPart['state'], string> = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'approval-requested': 'Approval Requested',
    'approval-responded': 'Approval Responded',
    'output-available': 'Completed',
    'output-error': 'Error',
    'output-denied': 'Denied',
  };

  const icons: Record<ToolUIPart['state'], React.ReactNode> = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'approval-requested': <ClockIcon className="size-4 text-yellow-600" />,
    'approval-responded': <CheckCircleIcon className="size-4 text-blue-600" />,
    'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
    'output-error': <XCircleIcon className="size-4 text-red-600" />,
    'output-denied': <XCircleIcon className="size-4 text-orange-600" />,
  };

  return (
    <Badge
      className="gap-1 rounded-full text-xs"
      variant="secondary"
      style={{ color: 'var(--muted-foreground)' }}
    >
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  subTitle,
  type,
  state,
  showBadge = true,
  hasBackground = false,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-4 p-1',
      hasBackground && 'rounded-md bg-card',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-1">
      {getToolIcon(type)}
      {showBadge && getStatusBadge(state)}
      <div className="flex items-center gap-1">
        <span
          className="font-medium text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {title ?? type.split('-').slice(1).join('-')}
        </span>
        <span className="font-medium text-xs">{subTitle}</span>
      </div>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input?: unknown;
  rawInput?: unknown;
  language?: string;
};

export const ToolInput = ({
  className,
  input,
  rawInput,
  language,
  children,
  ...props
}: ToolInputProps) => {
  // 优先使用 rawInput，如果不存在则使用 input
  const inputData =
    children !== undefined
      ? children
      : rawInput !== undefined
        ? rawInput
        : input;

  // 如果 inputData 是字符串，直接使用，不进行 JSON.stringify
  const codeContent =
    typeof inputData === 'string'
      ? inputData
      : JSON.stringify(inputData, null, 2);

  return (
    <div className={cn('space-y-2 overflow-hidden', className)} {...props}>
      <CodeBlock
        code={codeContent}
        language={language ?? (typeof inputData === 'string' ? 'text' : 'json')}
      />
    </div>
  );
};

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = memo(
  function ToolOutput({
    className,
    output,
    errorText,
    ...props
  }: ToolOutputProps) {
    if (!(output || errorText)) {
      return null;
    }

    // errorText-only: 直接渲染错误信息，不走分级策略
    if (errorText && output == null) {
      return (
        <div className={cn('space-y-2 px-1 pb-1', className)} {...props}>
          <div className="overflow-x-auto rounded-md text-xs bg-destructive/10 text-destructive p-1">
            <div>{errorText}</div>
          </div>
        </div>
      );
    }

    const outputStr =
      typeof output === 'string'
        ? output
        : typeof output === 'object'
          ? JSON.stringify(output ?? '', null, 2)
          : String(output ?? '');
    const language = typeof output === 'object' ? 'json' : 'text';
    const strategy = getCodeRenderStrategy(outputStr);

    let Output: ReactNode;
    if (strategy === 'summary') {
      const lineCount = outputStr.split('\n').length;
      Output = (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          输出已折叠（{lineCount} 行）
        </div>
      );
    } else if (strategy === 'plain') {
      Output = (
        <pre className="m-0 overflow-auto bg-transparent px-4 py-2 font-mono text-xs leading-5 text-foreground whitespace-pre-wrap">
          {outputStr}
        </pre>
      );
    } else {
      Output = <CodeBlock code={outputStr} language={language} />;
    }

    return (
      <div className={cn('space-y-2 px-1 pb-1', className)} {...props}>
        <div
          className={cn(
            'overflow-x-auto rounded-md text-xs [&_table]:w-full p-1',
            errorText ? 'bg-destructive/10 text-destructive' : 'text-foreground'
          )}
        >
          {errorText && <div>{errorText}</div>}
          {Output}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.output === next.output && prev.errorText === next.errorText
);
