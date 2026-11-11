import { NextResponse } from 'next/server';
import { podFetch } from '@/lib/pod';
import { clearSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await podFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  } finally {
    await clearSessionToken();
  }
  return NextResponse.json({ success: true });
}
