import { proxyToAgent } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();
  const projectId = body.projectId as string | undefined;
  if (!projectId) {
    return Response.json({ error: 'projectId is required' }, { status: 400 });
  }

  const upstream = await proxyToAgent(projectId, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: body.messages,
      message: body.message,
    }),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
      'X-Sandbox-Project': projectId,
    },
  });
}
