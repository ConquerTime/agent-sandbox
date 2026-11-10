'use client';

import { Button } from '@cortex/ui/components/ui/button';
import type { Project } from './types';

interface PreviewPanelProps {
  project: Project | null;
}

export function PreviewPanel({ project }: PreviewPanelProps) {
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
            onClick={() => {
              const frame = document.getElementById(
                'preview-frame'
              ) as HTMLIFrameElement | null;
              if (frame) frame.src = frame.src;
            }}
          >
            Refresh
          </Button>
        ) : null}
      </div>
      {project ? (
        <iframe
          id="preview-frame"
          className="h-full w-full flex-1 bg-white"
          title="sandbox-preview"
          src={`/api/preview/${project.id}`}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Select a project to open its isolated preview.
        </div>
      )}
    </section>
  );
}
