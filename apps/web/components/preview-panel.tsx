'use client';

import { Button } from '@cortex/ui/components/ui/button';
import type { ChatStatus } from 'ai';
import { useEffect, useRef, useState } from 'react';
import type { Project } from './types';

interface PreviewPanelProps {
  project: Project | null;
  chatStatus?: ChatStatus;
}

export function PreviewPanel({ project, chatStatus }: PreviewPanelProps) {
  const [reloadToken, setReloadToken] = useState(0);
  const previousStatus = useRef<ChatStatus | undefined>(chatStatus);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = chatStatus;
    if (
      project &&
      (previous === 'streaming' || previous === 'submitted') &&
      chatStatus === 'ready'
    ) {
      setReloadToken((token) => token + 1);
    }
  }, [chatStatus, project]);

  useEffect(() => {
    setReloadToken(0);
  }, [project?.id]);

  return (
    <section className="preview-column flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Preview</h2>
          <div className="truncate text-xs text-muted-foreground">
            {project
              ? `Live workspace preview · ${project.id}`
              : 'Preview appears after a project is ready'}
          </div>
        </div>
        {project ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Refresh
          </Button>
        ) : null}
      </div>
      {project ? (
        <iframe
          key={`${project.id}-${reloadToken}`}
          id="preview-frame"
          className="h-full w-full flex-1 bg-white"
          title="sandbox-preview"
          src={`/api/preview/${project.id}?t=${reloadToken}`}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Select a project to open its isolated preview.
        </div>
      )}
    </section>
  );
}
