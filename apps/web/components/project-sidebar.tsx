'use client';

import { Badge } from '@cortex/ui/components/ui/badge';
import { Button } from '@cortex/ui/components/ui/button';
import { ScrollArea } from '@cortex/ui/components/ui/scroll-area';
import { Separator } from '@cortex/ui/components/ui/separator';
import type { AuthUser, Project } from './types';

interface ProjectSidebarProps {
  projects: Project[];
  selectedId: string | null;
  busy: boolean;
  user: AuthUser | null;
  inviteBusy?: boolean;
  inviteMessage?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onLogout: () => void;
  onCreateInvite?: () => void;
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ready' || status === 'running') return 'default';
  if (status === 'error') return 'destructive';
  if (status === 'stopped') return 'secondary';
  return 'outline';
}

export function ProjectSidebar({
  projects,
  selectedId,
  busy,
  user,
  inviteBusy,
  inviteMessage,
  onSelect,
  onCreate,
  onLogout,
  onCreateInvite,
}: ProjectSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">
            Agent Sandbox
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {user?.orgName || 'Organization'}
          </div>
        </div>
        <Button size="sm" onClick={onCreate} disabled={busy}>
          New
        </Button>
      </div>
      <Separator />
      <div className="space-y-2 p-3 text-xs text-muted-foreground">
        <div className="truncate">{user?.email || '…'}</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onLogout}
            disabled={busy}
          >
            Sign out
          </Button>
          {user?.role === 'owner' && onCreateInvite ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onCreateInvite}
              disabled={busy || inviteBusy}
            >
              {inviteBusy ? 'Creating…' : 'Invite'}
            </Button>
          ) : null}
        </div>
        {inviteMessage ? (
          <div className="break-all rounded-md border border-border bg-background p-2 font-mono text-[11px] text-foreground">
            {inviteMessage}
          </div>
        ) : null}
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <ul className="min-w-0 space-y-1 p-2">
          {projects.map((project) => {
            const active = selectedId === project.id;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onSelect(project.id)}
                  className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-border bg-sidebar-accent'
                      : 'border-transparent hover:bg-sidebar-accent/60'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
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
