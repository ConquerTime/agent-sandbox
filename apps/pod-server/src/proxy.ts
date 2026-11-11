import type { Context } from 'hono';
import { dbGetProjectForOrg, usingDatabase } from './db.js';
import { isReleaseRunning, resolveUpstreamBase } from './k8s/runtime.js';
import { ensureReady } from './projects.js';
import { getProjectForOrg } from './registry.js';

function stripPrefix(pathname: string, prefix: string): string {
  const rest = pathname.slice(prefix.length);
  if (!rest) return '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

async function resolveUpstream(
  projectId: string,
  orgId: string,
  kind: 'agent' | 'preview'
): Promise<{ targetBase: string }> {
  const record = usingDatabase()
    ? await dbGetProjectForOrg(projectId, orgId)
    : getProjectForOrg(projectId, orgId);
  if (!record) {
    throw Object.assign(new Error(`Project not found: ${projectId}`), {
      status: 404,
    });
  }

  // Only scale up when the release is not already ready — avoids a Scale
  // replace on every proxied chat/preview chunk.
  if (!(await isReleaseRunning(projectId))) {
    await ensureReady(projectId, orgId);
  }

  return { targetBase: resolveUpstreamBase(projectId, kind) };
}

export async function proxyToProject(
  c: Context,
  projectId: string,
  kind: 'agent' | 'preview',
  orgId: string
): Promise<Response> {
  const { targetBase } = await resolveUpstream(projectId, orgId, kind);
  const prefix = `/p/${projectId}/${kind}`;
  const path = stripPrefix(c.req.path, prefix);
  const search = new URL(c.req.url).search;
  const url = `${targetBase}${path}${search}`;

  const headers = new Headers(c.req.raw.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', c.req.header('host') || 'localhost');
  headers.set('x-forwarded-proto', 'http');
  headers.set('x-project-id', projectId);
  headers.set('x-org-id', orgId);

  const init: RequestInit = {
    method: c.req.method,
    headers,
    redirect: 'manual',
  };

  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    init.body = c.req.raw.body;
    Object.assign(init, { duplex: 'half' });
  }

  const upstream = await fetch(url, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');
  responseHeaders.set('x-sandbox-project', projectId);
  responseHeaders.set('x-sandbox-upstream', kind);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
