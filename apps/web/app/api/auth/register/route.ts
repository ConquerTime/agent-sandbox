import { NextResponse } from 'next/server';
import { getPodServerUrl } from '@/lib/pod';
import { setSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const upstream = await fetch(`${getPodServerUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      token?: string;
      user?: unknown;
      error?: string;
    };
    if (!upstream.ok || !data.token) {
      return NextResponse.json(
        { error: data.error || 'Registration failed' },
        { status: upstream.status || 500 }
      );
    }
    await setSessionToken(data.token);
    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
