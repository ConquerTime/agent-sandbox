'use client';

import { cn } from '@cortex/ui';
import { type HTMLAttributes, memo } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type DiffCodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  oldCode: string;
  newCode: string;
  language: string;
  showLineNumbers?: boolean;
  splitView?: boolean;
  showDiffOnly?: boolean;
  renderMode?: 'syntax' | 'plain';
};

export const DiffCodeBlock = memo(function DiffCodeBlock({
  oldCode,
  newCode,
  language,
  splitView = true,
  showDiffOnly = false,
  renderMode = 'syntax',
  className,
  ...props
}: DiffCodeBlockProps) {
  const renderPlainContent = (source: string) => (
    <pre className="m-0 bg-transparent px-2 py-0 font-mono text-xs leading-5 text-foreground whitespace-pre-wrap">
      {source}
    </pre>
  );

  const renderSyntaxContent = (source: string) => (
    <SyntaxHighlighter
      codeTagProps={{
        className: 'font-mono text-xs',
      }}
      customStyle={{
        padding: 0,
        margin: 0,
        background: 'transparent',
        color: 'inherit',
        lineHeight: 0,
      }}
      language={language}
      showLineNumbers={false}
      style={oneLight}
    >
      {source}
    </SyntaxHighlighter>
  );

  const renderContent =
    renderMode === 'plain' ? renderPlainContent : renderSyntaxContent;

  return (
    <div
      className={cn('relative w-full overflow-auto text-foreground', className)}
      style={{
        padding: '1em',
        fontSize: '0.875rem',
        paddingBlock: '0.2rem',
      }}
      {...props}
    >
      <ReactDiffViewer
        oldValue={oldCode}
        newValue={newCode}
        splitView={splitView}
        renderContent={renderContent}
        showDiffOnly={showDiffOnly}
        hideLineNumbers={true}
        extraLinesSurroundingDiff={0}
        useDarkTheme={false}
        styles={{
          variables: {
            light: {
              addedBackground: 'rgba(34, 197, 94, 0.1)',
              removedBackground: 'rgba(239, 68, 68, 0.1)',
              wordAddedBackground: 'rgba(34, 197, 94, 0.2)',
              wordRemovedBackground: 'rgba(239, 68, 68, 0.2)',
              addedGutterBackground: 'rgba(34, 197, 94, 0.1)',
              removedGutterBackground: 'rgba(239, 68, 68, 0.1)',
              gutterBackground: 'hsl(var(--muted))',
              gutterBackgroundDark: 'hsl(var(--muted))',
              highlightBackground: 'hsl(var(--accent))',
              highlightGutterBackground: 'hsl(var(--accent))',
              diffViewerBackground: 'hsl(var(--background))',
              diffViewerColor: 'hsl(var(--foreground))',
              diffViewerTitleBackground: 'hsl(var(--muted))',
              diffViewerTitleColor: 'hsl(var(--foreground))',
              diffViewerTitleBorderColor: 'hsl(var(--border))',
              addedColor: 'hsl(var(--foreground))',
              removedColor: 'hsl(var(--foreground))',
              addedGutterColor: 'hsl(var(--muted-foreground))',
              removedGutterColor: 'hsl(var(--muted-foreground))',
              gutterColor: 'hsl(var(--muted-foreground))',
              codeFoldGutterBackground: 'hsl(var(--background))',
            },
            dark: {
              addedBackground: 'rgba(34, 197, 94, 0.15)',
              removedBackground: 'rgba(239, 68, 68, 0.15)',
              wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
              wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
              addedGutterBackground: 'rgba(34, 197, 94, 0.15)',
              removedGutterBackground: 'rgba(239, 68, 68, 0.15)',
              gutterBackground: 'hsl(var(--muted))',
              gutterBackgroundDark: 'hsl(var(--muted))',
              highlightBackground: 'hsl(var(--accent))',
              highlightGutterBackground: 'hsl(var(--accent))',
              diffViewerBackground: 'hsl(var(--background))',
              diffViewerColor: 'hsl(var(--foreground))',
              diffViewerTitleBackground: 'hsl(var(--muted))',
              diffViewerTitleColor: 'hsl(var(--foreground))',
              diffViewerTitleBorderColor: 'hsl(var(--border))',
              addedColor: 'hsl(var(--foreground))',
              removedColor: 'hsl(var(--foreground))',
              addedGutterColor: 'hsl(var(--muted-foreground))',
              removedGutterColor: 'hsl(var(--muted-foreground))',
              gutterColor: 'hsl(var(--muted-foreground))',
              codeFoldGutterBackground: 'hsl(var(--background))',
            },
          },
          marker: {
            display: 'none',
          },
          wordDiff: {
            padding: 0,
          },
          contentText: {
            lineHeight:
              'var(--tw-leading, var(--text-xs--line-height)) !important',
          },
        }}
      />
    </div>
  );
});
