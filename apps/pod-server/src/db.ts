import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import pg from 'pg';
import {
  hashPassword,
  hashToken,
  verifyPassword,
  type AuthUser,
  type OrgRole,
} from './auth.js';
import type { ProjectRecord, ProjectStatus } from './registry.js';

const { Pool } = pg;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let pool: pg.Pool | null = null;
const projectIds = new Set<string>();

export function usingDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

function newId(): string {
  return nanoid(12).toLowerCase().replace(/_/g, 'x');
}

export function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function migrate(): Promise<void> {
  const db = getPool();
  await db.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const applied = await db.query(
      'select 1 from schema_migrations where id = $1',
      [file]
    );
    if (applied.rowCount) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    await db.query(sql);
    await db.query(
      'insert into schema_migrations (id) values ($1) on conflict do nothing',
      [file]
    );
  }
}

export async function loadProjectIdCache(): Promise<void> {
  const result = await getPool().query<{ id: string }>('select id from projects');
  projectIds.clear();
  for (const row of result.rows) projectIds.add(row.id);
}

export function dbHasProject(id: string): boolean {
  return projectIds.has(id);
}

function remember(id: string): void {
  projectIds.add(id);
}

function forget(id: string): void {
  projectIds.delete(id);
}

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  org_id: string;
  role: OrgRole;
  org_name: string;
};

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    orgId: row.org_id,
    role: row.role,
    orgName: row.org_name,
  };
}

async function issueSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await getPool().query(
    `insert into sessions (id, token_hash, user_id, expires_at)
     values ($1, $2, $3, $4)`,
    [newId(), hashToken(token), userId, expires]
  );
  return token;
}

export async function dbRegister(input: {
  email: string;
  password: string;
  orgName?: string;
  inviteCode?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw httpError('Valid email is required', 400);
  }
  if (!input.password || input.password.length < 8) {
    throw httpError('Password must be at least 8 characters', 400);
  }

  const client = await getPool().connect();
  try {
    await client.query('begin');
    const existing = await client.query('select 1 from users where email = $1', [
      email,
    ]);
    if (existing.rowCount) {
      throw httpError('Email already registered', 409);
    }

    const now = new Date().toISOString();
    let orgId: string;
    let orgName: string;
    let role: OrgRole;
    const inviteCode = input.inviteCode?.trim();
    if (inviteCode) {
      const invite = await client.query<{ org_id: string; id: string }>(
        `select id, org_id from invites
         where code_hash = $1 and expires_at > now()`,
        [hashToken(inviteCode)]
      );
      const row = invite.rows[0];
      if (!row) throw httpError('Invalid or expired invite code', 400);
      const org = await client.query<{ name: string }>(
        'select name from orgs where id = $1',
        [row.org_id]
      );
      if (!org.rows[0]) throw httpError('Invite organization not found', 400);
      orgId = row.org_id;
      orgName = org.rows[0].name;
      role = 'member';
      await client.query('delete from invites where id = $1', [row.id]);
    } else {
      const name = input.orgName?.trim();
      if (!name) {
        throw httpError('Organization name or invite code is required', 400);
      }
      orgId = newId();
      orgName = name;
      role = 'owner';
      await client.query(
        'insert into orgs (id, name, created_at) values ($1, $2, $3)',
        [orgId, orgName, now]
      );
    }

    const userId = newId();
    await client.query(
      `insert into users (id, email, password_hash, org_id, role, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, email, hashPassword(input.password), orgId, role, now]
    );
    await client.query('commit');
    const token = await issueSession(userId);
    return {
      token,
      user: { id: userId, email, orgId, role, orgName },
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function dbLogin(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  const result = await getPool().query<UserRow>(
    `select u.id, u.email, u.password_hash, u.org_id, u.role, o.name as org_name
     from users u join orgs o on o.id = u.org_id
     where u.email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row || !verifyPassword(input.password, row.password_hash)) {
    throw httpError('Invalid email or password', 401);
  }
  const token = await issueSession(row.id);
  return { token, user: toAuthUser(row) };
}

export async function dbLogout(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await getPool().query('delete from sessions where token_hash = $1', [
    hashToken(token),
  ]);
}

export async function dbResolve(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const db = getPool();
  await db.query('delete from sessions where expires_at <= now()');
  const result = await db.query<UserRow>(
    `select u.id, u.email, u.password_hash, u.org_id, u.role, o.name as org_name
     from sessions s
     join users u on u.id = s.user_id
     join orgs o on o.id = u.org_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)]
  );
  const row = result.rows[0];
  return row ? toAuthUser(row) : null;
}

export async function dbCreateInvite(
  user: AuthUser
): Promise<{ code: string; expiresAt: string }> {
  if (user.role !== 'owner') {
    throw httpError('Only organization owners can create invites', 403);
  }
  const code = randomBytes(12).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  await getPool().query(
    `insert into invites (id, code_hash, org_id, created_by, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [newId(), hashToken(code), user.orgId, user.id, expiresAt]
  );
  return { code, expiresAt };
}

export async function dbListMembers(orgId: string): Promise<
  Array<{ id: string; email: string; role: OrgRole; createdAt: string }>
> {
  const result = await getPool().query<{
    id: string;
    email: string;
    role: OrgRole;
    created_at: Date;
  }>(
    `select id, email, role, created_at from users
     where org_id = $1 order by created_at asc`,
    [orgId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

type ProjectRow = {
  id: string;
  org_id: string;
  name: string;
  status: ProjectStatus;
  release_name: string;
  volume_path: string;
  created_at: Date;
  updated_at: Date;
  last_error: string | null;
};

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    orgId: row.org_id,
    releaseName: row.release_name,
    volumePath: row.volume_path,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    lastError: row.last_error ?? undefined,
  };
}

const PROJECT_COLUMNS = `id, org_id, name, status, release_name, volume_path, created_at, updated_at, last_error`;

export async function dbListProjects(orgId: string): Promise<ProjectRecord[]> {
  const result = await getPool().query<ProjectRow>(
    `select ${PROJECT_COLUMNS} from projects
     where org_id = $1 order by updated_at desc`,
    [orgId]
  );
  return result.rows.map(toProject);
}

export async function dbGetProjectForOrg(
  id: string,
  orgId: string
): Promise<ProjectRecord | null> {
  const result = await getPool().query<ProjectRow>(
    `select ${PROJECT_COLUMNS} from projects where id = $1 and org_id = $2`,
    [id, orgId]
  );
  return result.rows[0] ? toProject(result.rows[0]) : null;
}

export async function dbUpsertProject(record: ProjectRecord): Promise<ProjectRecord> {
  if (!record.orgId) {
    throw httpError('orgId is required', 400);
  }
  await getPool().query(
    `insert into projects (
       id, org_id, name, status, release_name, volume_path,
       created_at, updated_at, last_error
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do update set
       org_id = excluded.org_id,
       name = excluded.name,
       status = excluded.status,
       release_name = excluded.release_name,
       volume_path = excluded.volume_path,
       updated_at = excluded.updated_at,
       last_error = excluded.last_error`,
    [
      record.id,
      record.orgId,
      record.name,
      record.status,
      record.releaseName,
      record.volumePath,
      record.createdAt,
      record.updatedAt,
      record.lastError ?? null,
    ]
  );
  remember(record.id);
  return record;
}

export async function dbDeleteProject(id: string): Promise<boolean> {
  const result = await getPool().query('delete from projects where id = $1', [id]);
  forget(id);
  return (result.rowCount ?? 0) > 0;
}
