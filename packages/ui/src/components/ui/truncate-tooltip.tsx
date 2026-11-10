'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface TruncateTooltipProps {
  /** 要显示的文本内容 */
  children: string;
  /** Tooltip 显示位置 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 截断行数，默认单行 */
  lines?: number;
  /** 文本容器的额外样式 */
  className?: string;
  /** Tooltip 内容的额外样式 */
  tooltipClassName?: string;
}

/**
 * 带截断检测的文本组件
 * 只有当文本被截断（出现省略号）时才显示 Tooltip
 */
export function TruncateTooltip({
  children,
  side = 'top',
  lines = 1,
  className,
  tooltipClassName,
}: TruncateTooltipProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: children 变化时需重新检测截断
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) {
      const isOverflowing =
        lines > 1
          ? el.scrollHeight > el.clientHeight
          : el.scrollWidth > el.clientWidth;
      setIsTruncated(isOverflowing);
    }
  }, [children, lines]);

  const text = (
    <span
      ref={textRef}
      className={cn(lines > 1 ? 'block' : 'truncate block', className)}
    >
      {children}
    </span>
  );

  if (!isTruncated) {
    return text;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{text}</TooltipTrigger>
      <TooltipContent side={side} className={cn('max-w-sm', tooltipClassName)}>
        <p className="text-xs">{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}
