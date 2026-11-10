import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import get from 'lodash/get';
import { memo, useState } from 'react';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '../tool';

export const BashTool = memo(
  function BashTool({ part }: { part: UIMessagePart<UIDataTypes, UITools> }) {
    const typedPart = part as ToolUIPart<UITools>;
    const command = get(typedPart, 'input.command', '');
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="py-1 px-4">
        <Tool defaultOpen={false} onOpenChange={setIsOpen}>
          <ToolHeader
            hasBackground
            title={typedPart.type.replace('tool-', '')}
            type={typedPart.type}
            state={typedPart.state}
          />
          <ToolContent>
            {isOpen && (
              <>
                <ToolInput input={typedPart.input} language="bash">
                  {`$ ${command}`}
                </ToolInput>
                {(typedPart.output || typedPart.errorText) && (
                  <ToolOutput
                    output={typedPart.output}
                    errorText={typedPart.errorText}
                  />
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
