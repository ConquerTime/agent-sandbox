import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { migrate, usingDatabase } from './db.js';
import pg from 'pg';

const { Pool } = pg;

function dataRoot(): string {
  return process.env.POD_DATA_DIR || config.dataDir;
}

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(
      readFileSync(join(dataRoot(), 'registry', name), 'utf8')
    ) as T;
  } catch {
    return fallback;
  }
}

async function main(): Promise<void> {
  if (!usingDatabase()) {
    throw new Error('DATABASE_URL is required');
  }
  await migrate();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const skipped: string[] = [];

  const orgs = readJson<{ orgs: Array<{ id: string; name: string; createdAt: string }> }>(
    'orgs.json',
    { orgs: [] }
  ).orgs;
  for (const org of orgs) {
    await pool.query(
      `insert into orgs (id, name, created_at) values ($1, $2, $3)
       on conflict (id) do nothing`,
      [org.id, org.name, org.createdAt]
    );
  }

  const users = readJson<{
    users: Array<{
      id: string;
      email: string;
      passwordHash: string;
      orgId: string;
      role: string;
      createdAt: string;
    }>;
  }>('users.json', { users: [] }).users;
  for (const user of users) {
    await pool.query(
      `insert into users (id, email, password_hash, org_id, role, created_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.orgId,
        user.role,
        user.createdAt,
      ]
    );
  }

  const sessions = readJson<{
    sessions: Array<{ id: string; tokenHash: string; userId: string; expiresAt: string }>;
  }>('sessions.json', { sessions: [] }).sessions;
  for (const session of sessions) {
    await pool.query(
      `insert into sessions (id, token_hash, user_id, expires_at)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [session.id, session.tokenHash, session.userId, session.expiresAt]
    );
  }

  const invites = readJson<{
    invites: Array<{
      id: string;
      codeHash: string;
      orgId: string;
      createdBy: string;
      expiresAt: string;
    }>;
  }>('invites.json', { invites: [] }).invites;
  for (const invite of invites) {
    await pool.query(
      `insert into invites (id, code_hash, org_id, created_by, expires_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [invite.id, invite.codeHash, invite.orgId, invite.createdBy, invite.expiresAt]
    );
  }

  const projects = readJson<{
    projects: Array<{
      id: string;
      orgId?: string;
      name: string;
      status: string;
      releaseName: string;
      volumePath: string;
      createdAt: string;
      updatedAt: string;
      lastError?: string;
    }>;
  }>('projects.json', { projects: [] }).projects;
  for (const project of projects) {
    if (!project.orgId) {
      skipped.push(project.id);
      continue;
    }
    await pool.query(
      `insert into projects (
         id, org_id, name, status, release_name, volume_path,
         created_at, updated_at, last_error
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do nothing`,
      [
        project.id,
        project.orgId,
        project.name,
        project.status,
        project.releaseName,
        project.volumePath,
        project.createdAt,
        project.updatedAt,
        project.lastError ?? null,
      ]
    );
  }

  await pool.end();
  if (skipped.length > 0) {
    console.log(`Skipped projects without orgId: ${skipped.join(', ')}`);
  }
  console.log('Registry import finished. JSON files were left in place.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
