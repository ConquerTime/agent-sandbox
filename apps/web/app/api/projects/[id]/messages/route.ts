import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/lib/agent-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const upstream = await proxyToAgent(id, '/api/messages', {
      cache: 'no-store',
    });
    const data = (await upstream.json().catch(() => null)) as {
      messages?: unknown;
      error?: string;
    } | null;
    if (!upstream.ok || !data) {
      return NextResponse.json(
        {
          error:
            data?.error || `Failed to load messages (${upstream.status})`,
        },
        { status: upstream.ok ? 502 : upstream.status }
      );
    }
    return NextResponse.json({ messages: data.messages ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
