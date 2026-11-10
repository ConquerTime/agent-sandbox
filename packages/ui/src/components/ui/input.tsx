import type * as React from 'react';

import { cn } from '../../lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 基础样式
        'h-9 w-full min-w-0 px-3 py-1',
        // 圆角系统 (UI 规范: rounded-lg = 10px)
        'rounded-lg',
        // 颜色和背景
        'bg-white text-foreground',
        'border border-border',
        // 占位符和选择文本
        'placeholder:text-muted-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        // 阴影和过渡 (UI 规范: transition-all duration-200)
        'shadow-sm',
        'transition-all duration-200',
        'outline-none',
        // 焦点状态
        'focus-visible:border-primary',
        'focus-visible:ring-2 focus-visible:ring-primary/20',
        // 悬停状态
        'hover:border-primary/50',
        // 禁用状态
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        // 错误状态
        'aria-invalid:border-destructive',
        'aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        // 文件上传样式
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        // 响应式字体大小
        'text-base md:text-sm',
        // 动作偏好支持 (UI 规范)
        'motion-reduce:transition-none',
        className
      )}
      {...props}
    />
  );
}

export { Input };
