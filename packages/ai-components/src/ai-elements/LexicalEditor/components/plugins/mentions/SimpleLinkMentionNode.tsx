'use client';

import type { ReactNode } from 'react';

/** Lightweight mention chip for sandbox (no Lexical editor). */
export function SimpleLinkMentionNode({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm text-primary">
      {children}
    </span>
  );
}
