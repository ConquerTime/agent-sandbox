'use client';

import { Button } from '@cortex/ui/components/ui/button';
import { Textarea } from '@cortex/ui/components/ui/textarea';
import type { ChatStatus } from 'ai';
import { SendIcon, SquareIcon } from 'lucide-react';

interface SandboxPromptProps {
  value: string;
  status: ChatStatus;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
}

export function SandboxPrompt({
  value,
  status,
  disabled,
  onChange,
  onSend,
  onStop,
}: SandboxPromptProps) {
  const streaming = status === 'streaming' || status === 'submitted';

  return (
    <div className="border-t border-border bg-background/80 p-3 backdrop-blur">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          disabled
            ? 'Select a project first'
            : 'Describe the change you want in this sandbox…'
        }
        disabled={disabled || streaming}
        className="min-h-[88px] resize-none"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (!disabled && !streaming && value.trim()) onSend();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
        {streaming && onStop ? (
          <Button type="button" variant="secondary" size="sm" onClick={onStop}>
            <SquareIcon className="size-3.5" />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={disabled || !value.trim() || streaming}
            onClick={onSend}
          >
            <SendIcon className="size-3.5" />
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
