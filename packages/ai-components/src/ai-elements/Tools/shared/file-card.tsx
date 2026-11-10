/**
 * 共享的文件卡片组件和工具函数
 * 用于 ReadTool 和 WriteTool 显示 OSS 文件信息
 */

import type {
  OssFileData,
  RushUIDataTypes,
} from '@cortex/shared/types/ai-chat';
import type { UIMessage, UITools } from 'ai';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/**
 * OSS 文件 part 类型
 */
interface OssFilePart {
  type: 'data-oss-file';
  data: {
    toolCallId: string;
    data: OssFileData;
  };
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/**
 * 检查是否为 OssFilePart
 */
function isOssFilePart(part: { type: string }): part is OssFilePart {
  return (
    part.type === 'data-oss-file' &&
    typeof (part as OssFilePart).data === 'object' &&
    (part as OssFilePart).data !== null &&
    typeof (part as OssFilePart).data.toolCallId === 'string'
  );
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 根据文件扩展名获取图标
 */
export function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="size-5 text-purple-500" />;
  }

  if (['md', 'txt', 'json', 'yaml', 'yml', 'csv'].includes(ext)) {
    return <FileTextIcon className="size-5 text-blue-500" />;
  }

  if (
    [
      'html',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'vue',
      'py',
      'go',
      'rs',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
    ].includes(ext)
  ) {
    return <CodeIcon className="size-5 text-orange-500" />;
  }

  return <FileIcon className="size-5 text-gray-500" />;
}

/**
 * 从 message.parts 中查找对应的 OSS 文件信息
 *
 * 使用 type guard 确保类型安全
 */
export function findOssFile(
  message: UIMessage<unknown, RushUIDataTypes, UITools> | undefined,
  toolCallId: string | undefined
): OssFileData | undefined {
  if (!message || !toolCallId) return undefined;

  const ossFilePart = message.parts.find(
    (p): p is OssFilePart =>
      isOssFilePart(p) && p.data.toolCallId === toolCallId
  );

  return ossFilePart?.data.data;
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

interface FileCardProps {
  fileName: string;
  statusText: string;
  onClick?: () => void;
}

/**
 * 文件卡片组件 - 显示已完成的文件操作
 *
 * 当 onClick 存在时渲染为可点击按钮（带 hover 效果）
 * 当 onClick 不存在时渲染为静态 div（无交互样式）
 */
export function FileCard({ fileName, statusText, onClick }: FileCardProps) {
  const isClickable = !!onClick;

  const content = (
    <>
      {getFileIcon(fileName)}
      <div className="flex flex-1 flex-col items-start gap-0.5">
        <span className="font-medium text-sm text-foreground">{fileName}</span>
        <span className="text-xs text-muted-foreground">{statusText}</span>
      </div>
      <CheckCircleIcon className="size-4 text-green-500" />
      {isClickable && (
        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  const baseClassName =
    'flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3';
  const clickableClassName =
    'group cursor-pointer transition-all hover:border-border hover:bg-card hover:shadow-sm';

  if (isClickable) {
    return (
      <div className="py-1 px-4">
        <button
          type="button"
          onClick={onClick}
          className={`${baseClassName} ${clickableClassName}`}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className="py-1 px-4">
      <div className={baseClassName}>{content}</div>
    </div>
  );
}
