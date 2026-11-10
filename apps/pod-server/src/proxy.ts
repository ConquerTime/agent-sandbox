import type { Context } from 'hono';
import { getPublishedPorts, isContainerRunning } from './docker.js';
import { ensureReady } from './projects.js';
import { getProject } from './registry.js';

function stripPrefix(pathname: string, prefix: string): string {
  const rest = pathname.slice(prefix.length);
  if (!rest) return '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

async function resolveUpstream(
  projectId: string,
  kind: 'agent' | 'preview'
): Promise<{ targetBase: string }> {
  await ensureReady(projectId);
  const record = getProject(projectId);
  if (!record) {
    throw Object.assign(new Error(`Project not found: ${projectId}`), {
      status: 404,
    });
  }

  const running = await isContainerRunning(record.containerName);
  if (!running) {
    throw Object.assign(new Error(`Container not running: ${projectId}`), {
      status: 503,
    });
  }

  const ports = await getPublishedPorts(record.containerName);
  const hostPort =
    kind === 'agent' ? ports.agentHostPort : ports.previewHostPort;
  return { targetBase: `http://127.0.0.1:${hostPort}` };
}

export async function proxyToProject(
  c: Context,
  projectId: string,
  kind: 'agent' | 'preview'
): Promise<Response> {
  const { targetBase } = await resolveUpstream(projectId, kind);
  const prefix = `/p/${projectId}/${kind}`;
  const path = stripPrefix(c.req.path, prefix);
  const search = new URL(c.req.url).search;
  const url = `${targetBase}${path}${search}`;

  const headers = new Headers(c.req.raw.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', c.req.header('host') || 'localhost');
  headers.set('x-forwarded-proto', 'http');
  headers.set('x-project-id', projectId);

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
