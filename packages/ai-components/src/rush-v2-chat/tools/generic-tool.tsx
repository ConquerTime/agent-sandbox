/**
 * GenericTool - 通用工具渲染组件
 * 用于渲染未知或 MCP 自定义工具
 */

import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import { memo, useState } from 'react';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '../../ai-elements/tool';

export interface GenericToolProps {
  part: UIMessagePart<UIDataTypes, UITools>;
}

export const GenericTool = memo(
  function GenericTool({ part }: GenericToolProps) {
    const toolType = part.type as ToolUIPart['type'];
    const toolName = toolType.replace('tool-', '');
    const [isOpen, setIsOpen] = useState(false);

    const state =
      'state' in part
        ? (part.state as ToolUIPart['state'])
        : 'output-available';
    const input = 'input' in part ? part.input : undefined;
    const output = 'output' in part ? String(part.output ?? '') : undefined;
    const errorText =
      'errorText' in part ? String(part.errorText ?? '') : undefined;

    return (
      <div className="py-1 px-4">
        <Tool defaultOpen={false} onOpenChange={setIsOpen}>
          <ToolHeader title={toolName} type={toolType} state={state} />
          <ToolContent>
            {isOpen && (
              <>
                {input !== undefined && <ToolInput input={input} />}
                {(output || errorText) && (
                  <ToolOutput output={output} errorText={errorText} />
                )}
              </>
            )}
          </ToolContent>
        </Tool>
      </div>
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return prevPart === nextPart && prevPart.state === nextPart.state;
  }
);
