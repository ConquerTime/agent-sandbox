import { getPodServerUrl, readyProject } from '@/lib/pod';

export const dynamic = 'force-dynamic';

async function proxyPreview(
  request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path = [] } = await context.params;
  await readyProject(id);

  const suffix = path.length > 0 ? `/${path.join('/')}` : '';
  const incoming = new URL(request.url);
  const target = `${getPodServerUrl()}/p/${id}/preview${suffix}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    Object.assign(init, { duplex: 'half' });
  }

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export const GET = proxyPreview;
export const POST = proxyPreview;
export const PUT = proxyPreview;
export const PATCH = proxyPreview;
export const DELETE = proxyPreview;
