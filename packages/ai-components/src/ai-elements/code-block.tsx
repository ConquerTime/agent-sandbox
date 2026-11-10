'use client';

import { cn } from '@cortex/ui';
import { Button } from '@cortex/ui/components/ui/button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, memo, useContext, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

export const CodeBlock = memo(
  function CodeBlock({
    code,
    language,
    showLineNumbers = false,
    className,
    children,
    ...props
  }: CodeBlockProps) {
    return (
      <CodeBlockContext.Provider value={{ code }}>
        <div
          className={cn(
            'relative w-full overflow-hidden text-foreground',
            className
          )}
          {...props}
        >
          <div className="relative">
            <SyntaxHighlighter
              codeTagProps={{
                className: 'font-mono text-xs',
              }}
              customStyle={{
                paddingBlock: '0.2rem',
                margin: 0,
                fontSize: '0.875rem',
                background: 'transparent',
                color: 'inherit',
              }}
              language={language}
              lineNumberStyle={{
                color: 'hsl(var(--muted-foreground))',
                paddingRight: '1rem',
                minWidth: '2.5rem',
              }}
              showLineNumbers={showLineNumbers}
              style={oneLight}
            >
              {code}
            </SyntaxHighlighter>
            {children && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                {children}
              </div>
            )}
          </div>
        </div>
      </CodeBlockContext.Provider>
    );
  },
  (prev, next) =>
    prev.code === next.code &&
    prev.language === next.language &&
    prev.showLineNumbers === next.showLineNumbers &&
    prev.className === next.className &&
    prev.children === next.children
);

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined') {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      // 优先使用 Clipboard API（需要安全上下文 HTTPS）
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // 回退方案：使用 execCommand('copy')，兼容非安全上下文（HTTP）
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!success) {
          throw new Error('execCommand copy failed');
        }
      }
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
