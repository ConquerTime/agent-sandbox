import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createInvite,
  listOrgMembers,
  loginUser,
  logoutSession,
  registerUser,
  resolveAuthUser,
} from './auth.js';

describe('auth store', () => {
  let dir = '';
  const dirs: string[] = [];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pod-auth-'));
    dirs.push(dir);
    process.env.POD_DATA_DIR = dir;
  });

  afterEach(() => {
    delete process.env.POD_DATA_DIR;
    for (const path of dirs.splice(0)) {
      rmSync(path, { recursive: true, force: true });
    }
  });

  it('registers an owner and resolves the session', () => {
    const { token, user } = registerUser({
      email: 'Owner@Example.com',
      password: 'password1',
      orgName: 'Acme',
    });

    expect(user.email).toBe('owner@example.com');
    expect(user.role).toBe('owner');
    expect(user.orgName).toBe('Acme');
    expect(resolveAuthUser(token)?.id).toBe(user.id);
  });

  it('joins an organization with an invite code', () => {
    const owner = registerUser({
      email: 'owner@example.com',
      password: 'password1',
      orgName: 'Acme',
    });
    const invite = createInvite(owner.user);

    const member = registerUser({
      email: 'member@example.com',
      password: 'password1',
      inviteCode: invite.code,
    });

    expect(member.user.orgId).toBe(owner.user.orgId);
    expect(member.user.role).toBe('member');
    expect(listOrgMembers(owner.user.orgId).map((item) => item.email)).toEqual([
      'owner@example.com',
      'member@example.com',
    ]);
  });

  it('logs in and logs out', () => {
    registerUser({
      email: 'owner@example.com',
      password: 'password1',
      orgName: 'Acme',
    });
    const { token, user } = loginUser({
      email: 'owner@example.com',
      password: 'password1',
    });
    expect(user.email).toBe('owner@example.com');
    logoutSession(token);
    expect(resolveAuthUser(token)).toBeNull();
  });

  it('rejects duplicate emails', () => {
    registerUser({
      email: 'owner@example.com',
      password: 'password1',
      orgName: 'Acme',
    });
    expect(() =>
      registerUser({
        email: 'owner@example.com',
        password: 'password1',
        orgName: 'Other',
      })
    ).toThrow(/already registered/i);
  });
});
