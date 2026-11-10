'use client';

/**
 * PartRenderer - 消息片段渲染器
 * 根据消息片段类型选择合适的渲染组件
 *
 * 基于 Spec: specs/web/rush-v2-chat.spec.md
 */

import type {
  RushUIDataTypes,
  SuggestionItemRaw,
} from '@cortex/shared/types/ai-chat';
import type { UserQuestionAnswer } from '@cortex/shared/types/ask-user-question';
import type { ChatStatus, UIMessage, UIMessagePart, UITools } from 'ai';
import { memo, useEffect, useRef } from 'react';
import { SummarizationMessage } from '../../ai-elements/Capabilities/SummarizationCapability';
import { MessageText } from '../../ai-elements/message';
import { Reasoning } from '../../ai-elements/reasoning';
// 从 ai-elements 复用组件
import { Response } from '../../ai-elements/response';
// 从 rush-v2-chat 导入
import { defaultToolRegistry, type ToolRegistry } from '../tools/tool-registry';
import { MCPStatusCard } from './mcp-status-card';

/** WebdevInitProjectTool「查看」点击时由宿主打开预览 Drawer；previewUrl 即 viewHref */
export type OnWebdevInitPreviewClick = (params: { previewUrl: string }) => void;

export interface PartRendererProps {
  part: UIMessagePart<RushUIDataTypes, UITools>;
  message: UIMessage<unknown, RushUIDataTypes, UITools>;
  index: number;
  status: ChatStatus;
  isLastMessage?: boolean;
  toolRegistry?: ToolRegistry;
  /** 文件卡片点击回调，携带 filePath + 可选 ossPath，由宿主决定打开 OSS 预览还是 Code View */
  onFileClick?: (params: { filePath: string; ossPath?: string }) => void;
  onSuggestionSelect?: (item: SuggestionItemRaw) => void;
  /** 点击 WebdevInitProjectTool「查看」时调用，由宿主（如 apps/web）注入并 dispatch openDrawer */
  onWebdevInitPreviewClick?: OnWebdevInitPreviewClick;
  /** scaffold 卡片渲染时自动触发打开预览 Drawer（新项目首次创建成功时） */
  onScaffoldAutoOpenPreview?: () => void;
  /** AskUserQuestion option action 触发 agent 切换时通知宿主 */
  onSwitchAgent?: (params: { agentName: string; message: string }) => void;
  /** Sandbox host: wire AskUserQuestion answers through addToolOutput */
  onAskUserAnswer?: (params: {
    toolCallId: string;
    answers: UserQuestionAnswer[];
  }) => void | Promise<void>;
}

/**
 * 消息片段渲染器
 * 根据 part.type 选择合适的渲染组件
 */
export const PartRenderer = memo(
  function PartRenderer({
    part,
    message,
    index,
    status,
    isLastMessage = false,
    toolRegistry = defaultToolRegistry,
    onFileClick,
    onSuggestionSelect,
    onWebdevInitPreviewClick,
    onScaffoldAutoOpenPreview,
    onSwitchAgent,
    onAskUserAnswer,
  }: PartRendererProps) {
    // 文本片段：user 走 MessageText（识别 ElementDataType 块为 LinkMention 芯片），
    // assistant 直接走 Response，避免把助手产出的 HTML 片段误识别为 mention。
    if (part.type === 'text') {
      if (message.role === 'user') {
        return (
          <div className="px-2 py-2">
            <MessageText
              role="user"
              text={part.text}
              mode={status === 'streaming' ? 'streaming' : 'static'}
            />
          </div>
        );
      }
      return (
        <Response
          mode={status === 'streaming' ? 'streaming' : 'static'}
          className="px-2 py-2"
        >
          {part.text}
        </Response>
      );
    }

    // 推理片段
    if (part.type === 'reasoning') {
      return (
        <Reasoning isStreaming={status === 'streaming'} className="px-2 py-2">
          <Response>{part.text}</Response>
        </Reasoning>
      );
    }

    // 摘要片段
    if (part.type === 'data-summarization') {
      return <SummarizationMessage message={message} />;
    }

    // OSS 文件信息片段（由后端发送，数据已合并到对应的工具 part）
    // 这里返回 null，不单独渲染
    if (part.type === 'data-oss-file') {
      return null;
    }

    // Agent 自动路由信号：后端检测到 switch-agent action 后直接发送
    // 仅最后一条消息触发切换，防止历史消息回放/刷新时重复触发
    if ((part.type as string) === 'data-switch-agent' && isLastMessage) {
      return (
        <SwitchAgentTrigger
          part={
            part as unknown as { data: { agentName: string; message: string } }
          }
          onSwitchAgent={onSwitchAgent}
        />
      );
    }

    // MCP 状态片段
    if (part.type === 'data-mcp-status') {
      const mcpPart = part as unknown as {
        data: {
          status: {
            serverName: string;
            success: boolean;
            toolCount: number;
            toolNames: string[];
            error?: string;
            elapsedMs: number;
          }[];
          totalElapsedMs: number;
        };
      };
      return (
        <MCPStatusCard
          status={mcpPart.data?.status ?? []}
          totalElapsedMs={mcpPart.data?.totalElapsedMs ?? 0}
        />
      );
    }

    // 工具片段（以 tool- 开头）
    if (part.type.startsWith('tool-')) {
      const toolName = part.type.replace('tool-', '');
      const ToolComponent = toolRegistry.getRenderer(toolName);
      return (
        <ToolComponent
          part={part}
          message={message}
          status={status}
          isLastMessage={isLastMessage}
          onFileClick={onFileClick}
          onWebdevInitPreviewClick={onWebdevInitPreviewClick}
          onScaffoldAutoOpenPreview={onScaffoldAutoOpenPreview}
          onSwitchAgent={onSwitchAgent}
          onAskUserAnswer={onAskUserAnswer}
        />
      );
    }

    // 未知类型，返回 null
    return null;
  },
  (prev, next) =>
    prev.part === next.part &&
    prev.message === next.message &&
    prev.status === next.status &&
    prev.isLastMessage === next.isLastMessage &&
    prev.index === next.index &&
    prev.onFileClick === next.onFileClick &&
    prev.onSuggestionSelect === next.onSuggestionSelect &&
    prev.onWebdevInitPreviewClick === next.onWebdevInitPreviewClick &&
    prev.onScaffoldAutoOpenPreview === next.onScaffoldAutoOpenPreview &&
    prev.onSwitchAgent === next.onSwitchAgent &&
    prev.onAskUserAnswer === next.onAskUserAnswer
);

PartRenderer.displayName = 'PartRenderer';

function SwitchAgentTrigger({
  part,
  onSwitchAgent,
}: {
  part: { data: { agentName: string; message: string } };
  onSwitchAgent?: (params: { agentName: string; message: string }) => void;
}) {
  const executedRef = useRef(false);
  useEffect(() => {
    if (executedRef.current || !onSwitchAgent || !part.data) return;
    executedRef.current = true;
    onSwitchAgent({
      agentName: part.data.agentName,
      message: part.data.message,
    });
  }, [part.data, onSwitchAgent]);
  return null;
}
