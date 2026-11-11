import {
  createUIMessageStreamResponse,
  JsonToSseTransformStream,
  UI_MESSAGE_STREAM_HEADERS,
} from 'ai';
import Redis from 'ioredis';
import { nanoid } from 'nanoid';
import pg from 'pg';
import { createResumableStreamContext } from 'resumable-stream/ioredis';

const { Pool } = pg;

const STREAM_TTL_MS = 15 * 60 * 1000;

export type ResumeState = null | true | 'DONE';

export function streamIsFresh(startedAt: Date | string | null, now = Date.now()): boolean {
  if (!startedAt) return false;
  const at = startedAt instanceof Date ? startedAt.getTime() : Date.parse(startedAt);
  if (Number.isNaN(at)) return false;
  return now - at < STREAM_TTL_MS;
}

/** What to do when resumeExistingStream returns empty. */
export function resumeAfterMiss(
  state: ResumeState
): 'clear' | 'retry' {
  if (state === null || state === 'DONE') return 'clear';
  return 'retry';
}

let pool: pg.Pool | null = null;
let redisContext: ReturnType<typeof createResumableStreamContext> | null = null;
let abortController: AbortController | null = null;
let activeStreamId: string | null = null;

function projectId(): string {
  return process.env.PROJECT_ID || '';
}

function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || '';
}

function redisUrl(): string {
  return process.env.REDIS_URL?.trim() || '';
}

export function resumeEnabled(): boolean {
  return Boolean(databaseUrl() && redisUrl() && projectId());
}

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

function getRedis() {
  if (!redisUrl()) return null;
  if (!redisContext) {
    const publisher = new Redis(redisUrl(), { maxRetriesPerRequest: 2 });
    const subscriber = new Redis(redisUrl(), { maxRetriesPerRequest: null });
    redisContext = createResumableStreamContext({
      waitUntil: null,
      publisher,
      subscriber,
    });
  }
  return redisContext;
}

export function armGeneration(): AbortSignal {
  abortController = new AbortController();
  return abortController.signal;
}

export async function beginStream(): Promise<
  { conflict: true } | { streamId: string | null }
> {
  if (!resumeEnabled()) return { streamId: null };
  if (!getRedis()) return { streamId: null };

  const id = projectId();
  const streamId = nanoid();
  let result: pg.QueryResult;
  try {
    result = await getPool().query(
    `update projects
     set active_stream_id = $1,
         active_stream_started_at = now(),
         updated_at = now()
     where id = $2
       and (
         active_stream_id is null
         or active_stream_started_at < now() - interval '15 minutes'
       )`,
    [streamId, id]
  );
  } catch (error) {
    console.warn('[resume] claim failed; chatting without resume', error);
    return { streamId: null };
  }
  if ((result.rowCount ?? 0) > 0) {
    activeStreamId = streamId;
    return { streamId };
  }

  try {
    const existing = await getPool().query<{ active_stream_id: string | null }>(
      'select active_stream_id from projects where id = $1',
      [id]
    );
    if (!existing.rows[0]) return { streamId: null };
    if (existing.rows[0].active_stream_id) return { conflict: true };
  } catch (error) {
    console.warn('[resume] claim lookup failed; chatting without resume', error);
  }
  return { streamId: null };
}

export async function releaseActiveStream(): Promise<void> {
  const streamId = activeStreamId;
  activeStreamId = null;
  abortController = null;
  if (!streamId || !databaseUrl() || !projectId()) return;
  try {
    await getPool().query(
      `update projects
       set active_stream_id = null,
           active_stream_started_at = null,
           updated_at = now()
       where id = $1 and active_stream_id = $2`,
      [projectId(), streamId]
    );
  } catch (error) {
    console.warn('[resume] clear failed', error);
  }
}

/** The in-process producer died with the previous process. Drop its pointer. */
export async function clearStreamOnBoot(): Promise<void> {
  if (!databaseUrl() || !projectId()) return;
  await getPool().query(
    `update projects
     set active_stream_id = null,
         active_stream_started_at = null,
         updated_at = now()
     where id = $1 and active_stream_id is not null`,
    [projectId()]
  );
}

export async function stopGeneration(): Promise<void> {
  abortController?.abort();
  await releaseActiveStream();
}

async function clearStreamId(streamId: string): Promise<void> {
  if (!databaseUrl() || !projectId()) return;
  await getPool().query(
    `update projects
     set active_stream_id = null,
         active_stream_started_at = null,
         updated_at = now()
     where id = $1 and active_stream_id = $2`,
    [projectId(), streamId]
  );
  if (activeStreamId === streamId) activeStreamId = null;
}

type ActiveRow = {
  active_stream_id: string | null;
  active_stream_started_at: Date | null;
};

async function readActive(): Promise<ActiveRow | null> {
  if (!databaseUrl() || !projectId()) return null;
  const result = await getPool().query<ActiveRow>(
    `select active_stream_id, active_stream_started_at
     from projects where id = $1`,
    [projectId()]
  );
  return result.rows[0] ?? null;
}

export async function streamStatus(): Promise<{
  activeStreamId: string | null;
  canResume: boolean;
}> {
  let row: ActiveRow | null;
  try {
    row = await readActive();
  } catch (error) {
    console.warn('[resume] status read failed', error);
    return { activeStreamId: null, canResume: false };
  }
  const streamId = row?.active_stream_id ?? null;
  if (!streamId) return { activeStreamId: null, canResume: false };
  const redis = getRedis();
  if (!redis) return { activeStreamId: null, canResume: false };
  try {
    const state = await redis.hasExistingStream(streamId);
    if (resumeAfterMiss(state) === 'clear') {
      await clearStreamId(streamId);
      return { activeStreamId: null, canResume: false };
    }
    return { activeStreamId: streamId, canResume: true };
  } catch (error) {
    console.warn('[resume] status check failed', error);
    return { activeStreamId: streamId, canResume: false };
  }
}

export async function resumeResponse(): Promise<Response> {
  let row: ActiveRow | null;
  try {
    row = await readActive();
  } catch (error) {
    console.warn('[resume] pointer read failed', error);
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const streamId = row?.active_stream_id ?? null;
  if (!streamId) return new Response(null, { status: 204 });
  const redis = getRedis();
  if (!redis) return new Response(null, { status: 204 });

  try {
    const resumed = await redis.resumeExistingStream(streamId);
    if (resumed) return sseResponse(resumed);
    const state = await redis.hasExistingStream(streamId);
    if (resumeAfterMiss(state) === 'clear') {
      await clearStreamId(streamId);
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ error: 'Stream is temporarily unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.warn('[resume] redis resume failed', error);
    return new Response(JSON.stringify({ error: 'Redis unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
}

function sseResponse(stream: ReadableStream<string>): Response {
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}

export async function chatSseResponse(
  uiStream: ReadableStream<unknown>
): Promise<Response> {
  const streamId = activeStreamId;
  const redis = streamId ? getRedis() : null;
  if (!streamId || !redis) {
    return createUIMessageStreamResponse({
      stream: uiStream as Parameters<
        typeof createUIMessageStreamResponse
      >[0]['stream'],
    });
  }

  let taken = false;
  try {
    const sse = await redis.createNewResumableStream(streamId, () => {
      taken = true;
      return uiStream.pipeThrough(new JsonToSseTransformStream());
    });
    if (!sse) {
      throw new Error(`resumable stream ${streamId} was already done`);
    }
    return sseResponse(sse);
  } catch (error) {
    console.error('[resume] failed to buffer stream', error);
    if (taken) {
      return new Response(JSON.stringify({ error: 'Failed to buffer stream' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    return createUIMessageStreamResponse({
      stream: uiStream as Parameters<
        typeof createUIMessageStreamResponse
      >[0]['stream'],
    });
  }
}

export async function sweepStaleStream(): Promise<void> {
  const row = await readActive();
  const streamId = row?.active_stream_id ?? null;
  if (!streamId) return;
  if (streamIsFresh(row?.active_stream_started_at ?? null)) return;
  const redis = getRedis();
  if (!redis) {
    await clearStreamId(streamId);
    return;
  }
  try {
    const state = await redis.hasExistingStream(streamId);
    if (state === null || state === 'DONE') await clearStreamId(streamId);
  } catch (error) {
    console.warn('[resume] sweep skipped', error);
  }
}
