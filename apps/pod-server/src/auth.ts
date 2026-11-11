import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { config } from './config.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

export type OrgRole = 'owner' | 'member';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  orgId: string;
  role: OrgRole;
  createdAt: string;
}

export interface OrgRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface InviteRecord {
  id: string;
  codeHash: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: OrgRole;
  orgName: string;
}

function dataRoot(): string {
  return process.env.POD_DATA_DIR || config.dataDir;
}

function registryDir(): string {
  const dir = join(dataRoot(), 'registry');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function usersPath(): string {
  return join(registryDir(), 'users.json');
}

function orgsPath(): string {
  return join(registryDir(), 'orgs.json');
}

function sessionsPath(): string {
  return join(registryDir(), 'sessions.json');
}

function invitesPath(): string {
  return join(registryDir(), 'invites.json');
}

function ensureJsonFile(path: string, empty: object): void {
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(empty, null, 2));
  }
}

function readJson<T>(path: string, empty: T): T {
  ensureJsonFile(path, empty as object);
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return empty;
  }
}

function writeJson(path: string, value: unknown): void {
  ensureJsonFile(path, {});
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function newId(): string {
  return nanoid(12).toLowerCase().replace(/_/g, 'x');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || randomBytes(16).toString('hex');
  const hash = scryptSync(password, usedSalt, SCRYPT_KEYLEN).toString('hex');
  return `${usedSalt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expectedBuf = Buffer.from(expected, 'hex');
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function issueToken(): string {
  return randomBytes(32).toString('hex');
}

function issueInviteCode(): string {
  return randomBytes(12).toString('hex');
}

function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

function readUsers(): UserRecord[] {
  return readJson<{ users: UserRecord[] }>(usersPath(), { users: [] }).users;
}

function writeUsers(users: UserRecord[]): void {
  writeJson(usersPath(), { users });
}

function readOrgs(): OrgRecord[] {
  return readJson<{ orgs: OrgRecord[] }>(orgsPath(), { orgs: [] }).orgs;
}

function writeOrgs(orgs: OrgRecord[]): void {
  writeJson(orgsPath(), { orgs });
}

function readSessions(): SessionRecord[] {
  return readJson<{ sessions: SessionRecord[] }>(sessionsPath(), {
    sessions: [],
  }).sessions;
}

function writeSessions(sessions: SessionRecord[]): void {
  writeJson(sessionsPath(), { sessions });
}

function readInvites(): InviteRecord[] {
  return readJson<{ invites: InviteRecord[] }>(invitesPath(), {
    invites: [],
  }).invites;
}

function writeInvites(invites: InviteRecord[]): void {
  writeJson(invitesPath(), { invites });
}

function pruneExpiredSessions(sessions: SessionRecord[], now: Date): SessionRecord[] {
  const nowMs = now.getTime();
  return sessions.filter((session) => Date.parse(session.expiresAt) > nowMs);
}

function pruneExpiredInvites(invites: InviteRecord[], now: Date): InviteRecord[] {
  const nowMs = now.getTime();
  return invites.filter((invite) => Date.parse(invite.expiresAt) > nowMs);
}

function toAuthUser(user: UserRecord, org: OrgRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
    orgName: org.name,
  };
}

function findUserByEmail(email: string): UserRecord | null {
  const normalized = normalizeEmail(email);
  return readUsers().find((user) => user.email === normalized) ?? null;
}

function findOrg(orgId: string): OrgRecord | null {
  return readOrgs().find((org) => org.id === orgId) ?? null;
}

function findUser(userId: string): UserRecord | null {
  return readUsers().find((user) => user.id === userId) ?? null;
}

export function registerUser(input: {
  email: string;
  password: string;
  orgName?: string;
  inviteCode?: string;
}): { token: string; user: AuthUser } {
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!email || !email.includes('@')) {
    throw httpError('Valid email is required', 400);
  }
  if (!password || password.length < 8) {
    throw httpError('Password must be at least 8 characters', 400);
  }
  if (findUserByEmail(email)) {
    throw httpError('Email already registered', 409);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let org: OrgRecord;
  let role: OrgRole;

  const inviteCode = input.inviteCode?.trim();
  if (inviteCode) {
    const invites = pruneExpiredInvites(readInvites(), now);
    const codeHash = hashToken(inviteCode);
    const invite = invites.find((item) => item.codeHash === codeHash);
    if (!invite) {
      writeInvites(invites);
      throw httpError('Invalid or expired invite code', 400);
    }
    const existing = findOrg(invite.orgId);
    if (!existing) {
      throw httpError('Invite organization not found', 400);
    }
    org = existing;
    role = 'member';
    writeInvites(invites.filter((item) => item.id !== invite.id));
  } else {
    const orgName = input.orgName?.trim();
    if (!orgName) {
      throw httpError('Organization name or invite code is required', 400);
    }
    org = {
      id: newId(),
      name: orgName,
      createdAt: nowIso,
    };
    writeOrgs([...readOrgs(), org]);
    role = 'owner';
  }

  const user: UserRecord = {
    id: newId(),
    email,
    passwordHash: hashPassword(password),
    orgId: org.id,
    role,
    createdAt: nowIso,
  };
  writeUsers([...readUsers(), user]);

  const token = createSession(user.id, now);
  return { token, user: toAuthUser(user, org) };
}

export function loginUser(input: {
  email: string;
  password: string;
}): { token: string; user: AuthUser } {
  const user = findUserByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw httpError('Invalid email or password', 401);
  }
  const org = findOrg(user.orgId);
  if (!org) {
    throw httpError('Organization not found', 500);
  }
  const token = createSession(user.id, new Date());
  return { token, user: toAuthUser(user, org) };
}

function createSession(userId: string, now: Date): string {
  const token = issueToken();
  const sessions = pruneExpiredSessions(readSessions(), now);
  sessions.push({
    id: newId(),
    tokenHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  });
  writeSessions(sessions);
  return token;
}

export function logoutSession(token: string | null | undefined): void {
  if (!token) return;
  const tokenHash = hashToken(token);
  const sessions = pruneExpiredSessions(readSessions(), new Date()).filter(
    (session) => session.tokenHash !== tokenHash
  );
  writeSessions(sessions);
}

export function resolveAuthUser(token: string | null | undefined): AuthUser | null {
  if (!token) return null;
  const now = new Date();
  const tokenHash = hashToken(token);
  let sessions = pruneExpiredSessions(readSessions(), now);
  const session = sessions.find((item) => item.tokenHash === tokenHash);
  if (!session) {
    writeSessions(sessions);
    return null;
  }
  const user = findUser(session.userId);
  if (!user) {
    sessions = sessions.filter((item) => item.id !== session.id);
    writeSessions(sessions);
    return null;
  }
  const org = findOrg(user.orgId);
  if (!org) return null;
  writeSessions(sessions);
  return toAuthUser(user, org);
}

export function createInvite(user: AuthUser): { code: string; expiresAt: string } {
  if (user.role !== 'owner') {
    throw httpError('Only organization owners can create invites', 403);
  }
  const now = new Date();
  const code = issueInviteCode();
  const invites = pruneExpiredInvites(readInvites(), now);
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  invites.push({
    id: newId(),
    codeHash: hashToken(code),
    orgId: user.orgId,
    createdBy: user.id,
    createdAt: now.toISOString(),
    expiresAt,
  });
  writeInvites(invites);
  return { code, expiresAt };
}

export function listOrgMembers(orgId: string): Array<{
  id: string;
  email: string;
  role: OrgRole;
  createdAt: string;
}> {
  return readUsers()
    .filter((user) => user.orgId === orgId)
    .map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function extractBearerToken(
  authorization: string | null | undefined
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}
