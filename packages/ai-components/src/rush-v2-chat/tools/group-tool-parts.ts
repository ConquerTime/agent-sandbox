import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import type { UIMessagePart, UITools } from 'ai';

export type PartGroup =
  | { kind: 'tool'; parts: UIMessagePart<RushUIDataTypes, UITools>[] }
  | {
      kind: 'single';
      part: UIMessagePart<RushUIDataTypes, UITools>;
      index: number;
    };

export function groupToolParts(
  visibleParts: UIMessagePart<RushUIDataTypes, UITools>[]
): PartGroup[] {
  const groups: PartGroup[] = [];
  let toolBuffer: UIMessagePart<RushUIDataTypes, UITools>[] = [];

  const flushToolBuffer = () => {
    if (toolBuffer.length === 0) return;
    groups.push({ kind: 'tool', parts: toolBuffer });
    toolBuffer = [];
  };

  for (let i = 0; i < visibleParts.length; i++) {
    const part = visibleParts[i];
    if (part.type.startsWith('tool-')) {
      toolBuffer.push(part);
    } else {
      flushToolBuffer();
      groups.push({ kind: 'single', part, index: i });
    }
  }
  flushToolBuffer();
  return groups;
}
