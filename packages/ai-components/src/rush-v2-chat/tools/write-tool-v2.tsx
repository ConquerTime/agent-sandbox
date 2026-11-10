/**
 * WriteToolV2 - v2 专属 Write 工具渲染
 * 完成态显示 FileCard（含 OSS 上传状态与点击预览），其余委托给共享 WriteTool
 */

import { getFileNameAndTypeFromPath } from '@cortex/shared/lib/tool';
import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import get from 'lodash/get';
import { memo } from 'react';
import {
  FileCard,
  findOssFile,
} from '../../ai-elements/Tools/shared/file-card';
import { WriteTool } from '../../ai-elements/Tools/WriteTool';
import type { ToolRendererProps } from './tool-registry';

export const WriteToolV2 = memo(
  function WriteToolV2({
    part,
    message,
    status,
    isLastMessage,
    onFileClick,
  }: ToolRendererProps) {
    const typedPart = part as ToolUIPart<UITools> & { toolCallId?: string };
    const filePath = get(
      typedPart,
      'input.file_path',
      get(typedPart, 'input.path', '')
    ) as string;
    const { fileName } = getFileNameAndTypeFromPath(filePath);
    const isCompleted = typedPart.state === 'output-available';

    if (isCompleted) {
      const ossFile = findOssFile(message, typedPart.toolCallId);
      return (
        <FileCard
          fileName={fileName}
          statusText={ossFile ? '文件已创建并上传' : '文件已创建'}
          onClick={
            onFileClick
              ? () => onFileClick({ filePath, ossPath: ossFile?.ossPath })
              : undefined
          }
        />
      );
    }

    return (
      <WriteTool
        part={part as UIMessagePart<UIDataTypes, UITools>}
        status={status}
        isLastMessage={isLastMessage}
      />
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return (
      prevPart === nextPart &&
      prevPart.state === nextPart.state &&
      prev.message === next.message &&
      prev.status === next.status &&
      prev.isLastMessage === next.isLastMessage
    );
  }
);
