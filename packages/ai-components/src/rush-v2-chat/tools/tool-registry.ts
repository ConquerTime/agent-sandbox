/**
 * ToolRegistry - 工具注册表
 * 管理工具名 → 渲染组件的映射
 *
 * 基于 Spec: specs/web/rush-v2-chat.spec.md
 */

import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import type { UserQuestionAnswer } from '@cortex/shared/types/ask-user-question';
import type { ChatStatus, UIMessage, UIMessagePart, UITools } from 'ai';
import type React from 'react';

// 从 ai-elements 复用工具组件
import { EditTool } from '../../ai-elements/Tools/EditTool';
import { GlobTool } from '../../ai-elements/Tools/GlobTool';
import { ReadTool } from '../../ai-elements/Tools/ReadTool';
import { TodoWriteTool } from '../../ai-elements/Tools/TodoWriteTool';
import { AskUserQuestionTool } from './ask-user-question-tool';
import { BashToolV2 } from './bash-tool-v2';
import { GenericTool } from './generic-tool';
import { WriteToolV2 } from './write-tool-v2';

/** WebdevInitProjectTool「查看」点击回调，由宿主注入；previewUrl 供 dispatch 传给 Drawer */
export type OnWebdevInitPreviewClick = (params: { previewUrl: string }) => void;

/**
 * 工具渲染器 Props
 */
export interface ToolRendererProps {
  part: UIMessagePart<RushUIDataTypes, UITools>;
  message?: UIMessage<unknown, RushUIDataTypes, UITools>;
  status: ChatStatus;
  isLastMessage: boolean;
  /** 文件卡片点击回调，携带 filePath + 可选 ossPath，由宿主决定打开 OSS 预览还是 Code View */
  onFileClick?: (params: { filePath: string; ossPath?: string }) => void;
  /** 仅 WebdevInitProjectTool 使用：点击「查看」时由宿主打开预览 Drawer */
  onWebdevInitPreviewClick?: OnWebdevInitPreviewClick;
  /** scaffold 卡片渲染时自动触发打开预览 Drawer（新项目首次创建成功时） */
  onScaffoldAutoOpenPreview?: () => void;
  /** AskUserQuestion option action 触发 agent 切换时通知宿主 */
  onSwitchAgent?: (params: { agentName: string; message: string }) => void;
  /**
   * Sandbox / open-source hosts: submit AskUserQuestion answers via addToolOutput.
   * When provided, the tool skips the enterprise `/api/ai-stream-v2/answer` path.
   */
  onAskUserAnswer?: (params: {
    toolCallId: string;
    answers: UserQuestionAnswer[];
  }) => void | Promise<void>;
}

/**
 * 工具渲染器类型
 */
export type ToolRenderer = React.ComponentType<ToolRendererProps>;

/**
 * 工具注册表配置
 */
export interface ToolRegistryConfig {
  tools: Record<string, ToolRenderer>;
}

/**
 * 工具注册表接口
 */
export interface ToolRegistry {
  getRenderer(toolName: string): ToolRenderer;
  register(toolName: string, renderer: ToolRenderer): void;
  has(toolName: string): boolean;
}

/**
 * 默认工具映射
 */
const defaultTools: Record<string, ToolRenderer> = {
  // Claude 工具（Bash/Write 使用 v2 专属组件：scaffold 卡片、FileCard 完成态）
  Bash: BashToolV2,
  Grep: BashToolV2, // 复用 Bash
  Read: ReadTool,
  Write: WriteToolV2,
  Edit: EditTool,
  MultiEdit: EditTool, // 复用 Edit
  Glob: GlobTool,
  TodoWrite: TodoWriteTool,
  LS: ReadTool, // 复用 Read
  AskUserQuestion: AskUserQuestionTool,

  // Sandbox agent extras
  Stat: ReadTool,

  // Gemini 工具（映射到对应的 Claude 工具组件）
  run_shell_command: BashToolV2,
  read_file: ReadTool,
  write_file: WriteToolV2,
};

/**
 * 创建工具注册表
 *
 * @param config 配置
 * @returns 工具注册表实例
 */
export function createToolRegistry(
  config?: Partial<ToolRegistryConfig>
): ToolRegistry {
  // 合并默认工具和自定义工具
  const tools: Record<string, ToolRenderer> = {
    ...defaultTools,
    ...config?.tools,
  };

  return {
    /**
     * 获取工具渲染组件
     */
    getRenderer(toolName: string): ToolRenderer {
      return tools[toolName] ?? GenericTool;
    },

    /**
     * 注册新工具
     */
    register(toolName: string, renderer: ToolRenderer): void {
      tools[toolName] = renderer;
    },

    /**
     * 检查工具是否已注册
     */
    has(toolName: string): boolean {
      return toolName in tools;
    },
  };
}

/**
 * 默认全局工具注册表
 */
export const defaultToolRegistry = createToolRegistry();
