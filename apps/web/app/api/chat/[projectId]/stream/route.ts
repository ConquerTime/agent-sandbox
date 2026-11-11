import { proxyToAgent } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const upstream = await proxyToAgent(projectId, '/api/chat/stream');
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
