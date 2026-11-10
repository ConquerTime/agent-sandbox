'use client';

import { XIcon } from 'lucide-react';
import { type KeyboardEvent, useCallback, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  disabled?: boolean;
  className?: string;
}

const TRIGGER_KEYS = new Set(['Enter', ',', ';']);

function TagInput({
  tags,
  onTagsChange,
  placeholder = '输入标签后按 Enter 添加',
  maxTags,
  allowDuplicates = false,
  disabled = false,
  className,
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (!tag) return false;
      if (!allowDuplicates && tags.includes(tag)) return false;
      if (maxTags != null && tags.length >= maxTags) return false;
      onTagsChange([...tags, tag]);
      return true;
    },
    [tags, onTagsChange, allowDuplicates, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;

      if (TRIGGER_KEYS.has(e.key)) {
        e.preventDefault();
        if (addTag(inputValue)) {
          setInputValue('');
        }
        return;
      }

      if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [addTag, removeTag, tags, inputValue]
  );

  const isAtMax = maxTags != null && tags.length >= maxTags;

  return (
    <div
      data-slot="tag-input"
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 px-2 py-1',
        'rounded-lg',
        'bg-white text-foreground',
        'border border-border',
        'shadow-sm',
        'transition-all duration-200',
        'focus-within:border-primary',
        'focus-within:ring-2 focus-within:ring-primary/20',
        'hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-50 bg-muted',
        'motion-reduce:transition-none',
        className
      )}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-0.5 pr-1 text-xs shrink-0"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              tabIndex={-1}
              aria-label={`删除标签 ${tag}`}
            >
              <XIcon className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      <input
        ref={inputRef}
        type="text"
        className={cn(
          'min-w-[80px] flex-1 bg-transparent outline-none',
          'placeholder:text-muted-foreground',
          'text-base md:text-sm',
          'py-0.5',
          'disabled:cursor-not-allowed'
        )}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled || isAtMax}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export { TagInput };
export type { TagInputProps };
