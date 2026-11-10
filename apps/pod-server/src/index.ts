import './env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { proxyToProject } from './proxy.js';
import {
  createProject,
  destroyProject,
  ensureReady,
  listPublicProjects,
  stopProject,
  toPublicProject,
} from './projects.js';
import { getProject } from './registry.js';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'pod-server',
    agentImage: config.agentImage,
  })
);

app.get('/api/projects', (c) => c.json({ projects: listPublicProjects() }));

app.post('/api/projects', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as { name?: string };
    const project = await createProject({ name: body.name });
    return c.json({ project }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

app.get('/api/projects/:id', (c) => {
  const project = getProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json({ project: toPublicProject(project) });
});

app.get('/api/projects/:id/ready', async (c) => {
  try {
    const project = await ensureReady(c.req.param('id'));
    return c.json({ ready: true, project });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ ready: false, error: message }, status as 404 | 500);
  }
});

app.post('/api/projects/:id/stop', async (c) => {
  try {
    const project = await stopProject(c.req.param('id'));
    return c.json({ project });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, status as 404 | 500);
  }
});

app.delete('/api/projects/:id', async (c) => {
  try {
    await destroyProject(c.req.param('id'));
    return c.json({ success: true });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, status as 404 | 500);
  }
});

app.all('/p/:id/agent', (c) => proxyToProject(c, c.req.param('id'), 'agent'));
app.all('/p/:id/agent/*', (c) => proxyToProject(c, c.req.param('id'), 'agent'));
app.all('/p/:id/preview', (c) =>
  proxyToProject(c, c.req.param('id'), 'preview')
);
app.all('/p/:id/preview/*', (c) =>
  proxyToProject(c, c.req.param('id'), 'preview')
);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[pod-server] listening on http://localhost:${info.port}`);
  console.log(`[pod-server] agent image: ${config.agentImage}`);
  console.log(`[pod-server] data dir: ${config.dataDir}`);
});
