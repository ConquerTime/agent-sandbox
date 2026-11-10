import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { UIMessage } from 'ai';
import { handleChat } from './chat.js';
import { loadMessages } from './messages.js';
import { startPreview } from './preview.js';
import { getWorkspaceDir } from './workspace.js';

const app = new Hono();
const agentPort = Number(process.env.AGENT_PORT || 4000);
const previewPort = Number(process.env.PREVIEW_PORT || 8000);

app.use('*', cors());

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'agent',
    projectId: process.env.PROJECT_ID || null,
    workspace: getWorkspaceDir(),
    previewPort,
  })
);

app.get('/api/messages', (c) => c.json({ messages: loadMessages() }));

app.post('/api/chat', async (c) => {
  try {
    const body = (await c.req.json()) as {
      messages?: UIMessage[];
      message?: UIMessage;
    };
    return await handleChat(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[agent] chat error:', message);
    return c.json({ error: message }, 500);
  }
});

startPreview(previewPort);

serve({ fetch: app.fetch, port: agentPort }, (info) => {
  console.log(`[agent] listening on http://0.0.0.0:${info.port}`);
  console.log(`[agent] workspace: ${getWorkspaceDir()}`);
});
