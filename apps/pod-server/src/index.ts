import './env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import {
  createInvite,
  extractBearerToken,
  listOrgMembers,
  loginUser,
  logoutSession,
  registerUser,
  resolveAuthUser,
  type AuthUser,
} from './auth.js';
import {
  dbCreateInvite,
  dbListMembers,
  dbLogin,
  dbLogout,
  dbRegister,
  dbResolve,
  loadProjectIdCache,
  migrate,
  usingDatabase,
} from './db.js';
import { config } from './config.js';
import { proxyToProject } from './proxy.js';
import {
  createProject,
  destroyProject,
  ensureReady,
  getPublicProjectForOrg,
  listPublicProjects,
  stopProject,
} from './projects.js';
import { poolStatus, scheduleReplenish } from './pool.js';

type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

const app = new Hono<AppEnv>();

app.use('*', cors());

function errorStatus(error: unknown): 400 | 401 | 403 | 404 | 409 | 500 {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status: number }).status);
    if (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 409
    ) {
      return status;
    }
  }
  return 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveSession(token: string | null): Promise<AuthUser | null> {
  if (usingDatabase()) return dbResolve(token);
  return resolveAuthUser(token);
}

const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearerToken(c.req.header('authorization'));
  const user = await resolveSession(token);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', user);
  await next();
});

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'pod-server',
    runtime: 'kubernetes',
    agentImage: config.agentImage,
    namespace: config.k8sNamespace,
    pool: poolStatus(),
  })
);

app.post('/api/auth/register', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      orgName?: string;
      inviteCode?: string;
    };
    const result = await (usingDatabase() ? dbRegister : registerUser)({
      email: body.email || '',
      password: body.password || '',
      orgName: body.orgName,
      inviteCode: body.inviteCode,
    });
    return c.json(result, 201);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const result = await (usingDatabase() ? dbLogin : loginUser)({
      email: body.email || '',
      password: body.password || '',
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.post('/api/auth/logout', requireAuth, async (c) => {
  const token = extractBearerToken(c.req.header('authorization'));
  if (usingDatabase()) await dbLogout(token);
  else logoutSession(token);
  return c.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (c) => {
  return c.json({ user: c.get('user') });
});

app.get('/api/org/members', requireAuth, async (c) => {
  const user = c.get('user');
  const members = usingDatabase()
    ? await dbListMembers(user.orgId)
    : listOrgMembers(user.orgId);
  return c.json({ members });
});

app.post('/api/org/invites', requireAuth, async (c) => {
  try {
    const invite = usingDatabase()
      ? await dbCreateInvite(c.get('user'))
      : createInvite(c.get('user'));
    return c.json({ invite }, 201);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.get('/api/projects', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ projects: await listPublicProjects(user.orgId) });
});

app.post('/api/projects', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = (await c.req.json().catch(() => ({}))) as { name?: string };
    const project = await createProject({ name: body.name, orgId: user.orgId });
    return c.json({ project }, 201);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.get('/api/projects/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const project = await getPublicProjectForOrg(c.req.param('id'), user.orgId);
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json({ project });
});

app.get('/api/projects/:id/ready', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const project = await ensureReady(c.req.param('id'), user.orgId);
    return c.json({ ready: true, project });
  } catch (error) {
    return c.json(
      { ready: false, error: errorMessage(error) },
      errorStatus(error)
    );
  }
});

app.post('/api/projects/:id/stop', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const project = await stopProject(c.req.param('id'), user.orgId);
    return c.json({ project });
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.delete('/api/projects/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    await destroyProject(c.req.param('id'), user.orgId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

app.all('/p/:id/agent', requireAuth, async (c) => {
  try {
    return await proxyToProject(c, c.req.param('id'), 'agent', c.get('user').orgId);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});
app.all('/p/:id/agent/*', requireAuth, async (c) => {
  try {
    return await proxyToProject(c, c.req.param('id'), 'agent', c.get('user').orgId);
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});
app.all('/p/:id/preview', requireAuth, async (c) => {
  try {
    return await proxyToProject(
      c,
      c.req.param('id'),
      'preview',
      c.get('user').orgId
    );
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});
app.all('/p/:id/preview/*', requireAuth, async (c) => {
  try {
    return await proxyToProject(
      c,
      c.req.param('id'),
      'preview',
      c.get('user').orgId
    );
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error));
  }
});

async function main(): Promise<void> {
  if (usingDatabase()) {
    await migrate();
    await loadProjectIdCache();
    console.log('[pod-server] control plane: postgres');
  } else {
    console.log('[pod-server] control plane: json registry');
  }

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`[pod-server] listening on http://0.0.0.0:${info.port}`);
    console.log(`[pod-server] runtime: kubernetes namespace=${config.k8sNamespace}`);
    console.log(`[pod-server] agent image: ${config.agentImage}`);
    console.log(`[pod-server] data dir: ${config.dataDir}`);
    if (config.agentDevRoot) {
      console.log(`[pod-server] agent dev mounts: ${config.agentDevRoot}`);
    }
    console.log(`[pod-server] pool size: ${config.poolSize}`);
    scheduleReplenish();
  });
}

main().catch((error: unknown) => {
  console.error('[pod-server] failed to start', error);
  process.exit(1);
});
