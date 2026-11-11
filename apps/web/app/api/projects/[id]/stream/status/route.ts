import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const upstream = await proxyToAgent(id, '/api/chat/stream/status');
  const data = await upstream.json().catch(() => ({
    activeStreamId: null,
    canResume: false,
  }));
  return NextResponse.json(data, { status: upstream.status });
}
