import { cn } from '@cortex/ui';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@cortex/ui/components/ui/avatar';
import type { UIMessage } from 'ai';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, HTMLAttributes } from 'react';
import { SimpleLinkMentionNode } from './LexicalEditor/components/plugins/mentions/SimpleLinkMentionNode';
import { Response } from './response';
import { splitElementMentions } from './split-element-mentions';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
  hasPaddingTop?: boolean;
  hasPaddingBottom?: boolean;
};

function getPaddingControllerClassName(
  hasPaddingTop: boolean,
  hasPaddingBottom: boolean
) {
  if (hasPaddingTop && hasPaddingBottom) {
    return 'py-4';
  }
  if (hasPaddingTop) {
    return 'pt-4';
  }
  return '';
}

export const Message = ({
  className,
  from,
  hasPaddingTop = true,
  hasPaddingBottom = true,
  ...props
}: MessageProps) => {
  const pyClassName = getPaddingControllerClassName(
    hasPaddingTop,
    hasPaddingBottom
  );

  return (
    <div
      className={cn(
        'group flex w-full items-end justify-end gap-2',
        pyClassName,
        from === 'user'
          ? 'is-user'
          : 'is-assistant flex-row-reverse justify-end',
        className
      )}
      {...props}
    />
  );
};
const messageContentVariants = cva(
  'is-user:dark flex flex-col gap-2 overflow-hidden text-sm',
  {
    variants: {
      variant: {
        contained: [
          'w-[100%]',
          'group-[.is-user]:bg-card group-[.is-user]:px-1.5 group-[.is-user]:py-1.5 group-[.is-user]:border group-[.is-user]:border-border',
          'group-[.is-assistant]:text-foreground group-[.is-assistant]:px-4',
        ],
        flat: [
          'group-[.is-user]:max-w-[80%] group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
          'group-[.is-assistant]:text-foreground',
        ],
      },
    },
    defaultVariants: {
      variant: 'contained',
    },
  }
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants> & {
    hasBorderRadiusAndPaddingTop?: boolean;
    hasBorderRadiusAndPaddingBottom?: boolean;
    /** user 气泡是否显示底边，用于同一条 user 消息内多 part（如图+文）视觉连贯 */
    hasBorderBottom?: boolean;
    /** user 气泡是否显示顶边，用于同一条 user 消息内多 part（如图+文）视觉连贯 */
    hasBorderTop?: boolean;
    from: UIMessage['role'];
  };

function getBorderRadiusAndPaddingControllerClassName(
  hasBorderRadiusAndPaddingTop: boolean,
  hasBorderRadiusAndPaddingBottom: boolean
) {
  if (hasBorderRadiusAndPaddingTop && hasBorderRadiusAndPaddingBottom) {
    return 'rounded-lg py-3';
  }
  if (hasBorderRadiusAndPaddingTop) {
    return 'rounded-t-lg pt-3';
  }
  if (hasBorderRadiusAndPaddingBottom) {
    return 'rounded-b-lg pb-3';
  }
  return '';
}

export const MessageContent = ({
  children,
  className,
  variant,
  hasBorderRadiusAndPaddingTop = true,
  hasBorderRadiusAndPaddingBottom = true,
  hasBorderBottom = true,
  hasBorderTop = true,
  from,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      messageContentVariants({ variant, className }),
      getBorderRadiusAndPaddingControllerClassName(
        hasBorderRadiusAndPaddingTop,
        hasBorderRadiusAndPaddingBottom
      ),
      from === 'user' ? 'w-[80%]' : '',
      from === 'user' && !hasBorderBottom && 'group-[.is-user]:border-b-0',
      from === 'user' && !hasBorderTop && 'group-[.is-user]:border-t-0',
      from === 'user' &&
        '[&_a]:text-blue-600 [&_a]:hover:text-blue-800 [&_a]:break-all'
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn('size-8 ring-1 ring-border', className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || 'ME'}</AvatarFallback>
  </Avatar>
);

const USER_RESPONSE_CLASSNAME =
  '[&_a]:text-white [&_a]:hover:text-gray-200 [&_a]:break-all [&_a]:word-break whitespace-pre-wrap break-words';

export const MessageText = ({
  role,
  text,
  mode,
}: {
  role: UIMessage['role'];
  text: string;
  mode?: 'static' | 'streaming';
}) => {
  if (role === 'user') {
    const segments = splitElementMentions(text);

    return (
      <>
        {segments.map((segment, index) => {
          // 段落顺序稳定（由 text 决定），index 作为 key 是安全的
          const key = `${segment.type}-${index}`;
          if (segment.type === 'mention') {
            return (
              <SimpleLinkMentionNode key={key}>
                {segment.content}
              </SimpleLinkMentionNode>
            );
          }
          if (segment.content === '') return null;
          return (
            <Response
              key={key}
              className={USER_RESPONSE_CLASSNAME}
              mode={mode}
              components={{
                a: SimpleLinkMentionNode,
              }}
            >
              {segment.content}
            </Response>
          );
        })}
      </>
    );
  }
  return <Response mode={mode}>{text}</Response>;
};
