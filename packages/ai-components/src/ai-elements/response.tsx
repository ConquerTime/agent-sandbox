'use client';

import { cn } from '@cortex/ui';
import type { Code, Html, Parent, Root } from 'mdast';
import { type ComponentProps, memo } from 'react';
import {
  defaultRehypePlugins,
  defaultRemarkPlugins,
  Streamdown,
} from 'streamdown';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import { remarkFixLooseListItems } from './remark-fix-loose-list-items';
import './Response/style.css';

const remarkHtmlToCode = (): Plugin<[Root], Root> => {
  return (tree: Root) => {
    visit(
      tree,
      'html',
      (node: Html, index: number | undefined, parent: Parent | undefined) => {
        if (!parent || typeof index !== 'number') return;
        // 把 html 节点替换成 code 节点，language = html
        const codeNode: Code = {
          type: 'code',
          lang: 'html',
          value: node.value || '',
        };
        parent.children[index] = codeNode;
      }
    );
  };
};

type ResponseProps = ComponentProps<typeof Streamdown> & {
  mode?: 'static' | 'streaming';
};

export const Response = memo(
  ({ className, rehypePlugins, mode = 'static', ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className,
        'response'
      )}
      mode={mode}
      rehypePlugins={
        rehypePlugins ?? [
          // 排除 defaultRehypePlugins.raw 以防止 HTML 渲染（XSS 安全）
          // 只保留安全的插件：harden（安全加固）
          defaultRehypePlugins.harden,
        ]
      }
      remarkPlugins={[
        defaultRemarkPlugins.gfm,
        remarkFixLooseListItems,
        remarkHtmlToCode,
      ]}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.mode === nextProps.mode
);

Response.displayName = 'Response';
