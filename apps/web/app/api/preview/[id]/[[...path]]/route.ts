import { proxyToPreview } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';

async function handlePreview(
  request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path = [] } = await context.params;
  const suffix = path.length > 0 ? `/${path.join('/')}` : '';
  const upstream = await proxyToPreview(id, suffix, request);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export const GET = handlePreview;
export const POST = handlePreview;
export const PUT = handlePreview;
export const PATCH = handlePreview;
export const DELETE = handlePreview;
