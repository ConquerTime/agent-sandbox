import { NextResponse } from 'next/server';
import { podFetch } from '@/lib/pod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await podFetch('/api/org/members');
    return NextResponse.json(data);
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
