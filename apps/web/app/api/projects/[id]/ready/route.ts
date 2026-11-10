import { NextResponse } from 'next/server';
import { readyProject } from '@/lib/pod';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const project = await readyProject(id);
    return NextResponse.json({ ready: true, project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
