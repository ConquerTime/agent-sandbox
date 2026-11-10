'use client';

import { Badge } from '@cortex/ui/components/ui/badge';
import { Button } from '@cortex/ui/components/ui/button';
import { ScrollArea } from '@cortex/ui/components/ui/scroll-area';
import { Separator } from '@cortex/ui/components/ui/separator';
import type { Project } from './types';

interface ProjectSidebarProps {
  projects: Project[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ready' || status === 'running') return 'default';
  if (status === 'error') return 'destructive';
  if (status === 'stopped') return 'secondary';
  return 'outline';
}

export function ProjectSidebar({
  projects,
  selectedId,
  busy,
  onSelect,
  onCreate,
}: ProjectSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">
            Agent Sandbox
          </div>
          <div className="truncate text-xs text-muted-foreground">
            Isolated projects · no login
          </div>
        </div>
        <Button size="sm" onClick={onCreate} disabled={busy}>
          New
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <ul className="space-y-1 p-2">
          {projects.map((project) => {
            const active = selectedId === project.id;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onSelect(project.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-border bg-sidebar-accent'
                      : 'border-transparent hover:bg-sidebar-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {project.name}
                    </span>
                    <Badge variant={statusVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {project.id}
                  </div>
                </button>
              </li>
            );
          })}
          {projects.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Create a project to spin up an isolated agent container.
            </li>
          ) : null}
        </ul>
      </ScrollArea>
    </aside>
  );
}
