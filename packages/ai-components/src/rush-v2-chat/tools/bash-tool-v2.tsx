/**
 * BashToolV2 - sandbox: always render shared BashTool
 * (enterprise WebdevInitProject scaffold UI is omitted)
 */

import type { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { memo } from 'react';
import { BashTool } from '../../ai-elements/Tools/BashTool';
import type { ToolRendererProps } from './tool-registry';

export const BashToolV2 = memo(
  function BashToolV2({ part }: ToolRendererProps) {
    return <BashTool part={part as UIMessagePart<UIDataTypes, UITools>} />;
  },
  (prev, next) => prev.part === next.part
);
