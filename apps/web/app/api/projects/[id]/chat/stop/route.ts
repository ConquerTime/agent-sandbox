import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const upstream = await proxyToAgent(id, '/api/chat/stop', { method: 'POST' });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
