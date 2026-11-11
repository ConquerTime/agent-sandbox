import { NextResponse } from 'next/server';
import { podFetch } from '@/lib/pod';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const data = await podFetch('/api/org/invites', { method: 'POST' });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      {
        status:
          status === 401 || status === 403 ? (status as 401 | 403) : 500,
      }
    );
  }
}
