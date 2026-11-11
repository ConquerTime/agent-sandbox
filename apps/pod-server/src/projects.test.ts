import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProject, listProjects } from './registry.js';
import { createProject, type CreateProjectDeps } from './projects.js';

describe('createProject pool claim', () => {
  let dir = '';
  const dirs: string[] = [];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pod-projects-'));
    dirs.push(dir);
    process.env.POD_DATA_DIR = dir;
    process.env.WORKSPACE_HOST_ROOT = join(dir, 'volumes');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.POD_DATA_DIR;
    delete process.env.WORKSPACE_HOST_ROOT;
    for (const path of dirs.splice(0)) {
      rmSync(path, { recursive: true, force: true });
    }
  });

  function deps(overrides: Partial<CreateProjectDeps> = {}): CreateProjectDeps {
    return {
      acquire: async () => null,
      createAndStart: vi.fn(async () => undefined),
      waitHealthy: vi.fn(async () => undefined),
      removeRelease: vi.fn(async () => undefined),
      replenish: vi.fn(),
      ...overrides,
    };
  }

  it('returns the idle pod without creating a release', async () => {
    const used = deps({
      acquire: async (commit) => {
        const slot = {
          id: 'pooledidle01',
          createdAt: '2026-11-11T00:00:00.000Z',
        };
        await commit(slot);
        return slot;
      },
    });

    const project = await createProject(
      { name: 'from pool', orgId: 'org-1' },
      used
    );

    expect(project.id).toBe('pooledidle01');
    expect(project.name).toBe('from pool');
    expect(project.orgId).toBe('org-1');
    expect(project.status).toBe('running');
    expect(used.createAndStart).not.toHaveBeenCalled();
    expect(used.waitHealthy).not.toHaveBeenCalled();
    expect(used.replenish).toHaveBeenCalledOnce();
    expect(listProjects().map((item) => item.id)).toEqual(['pooledidle01']);
    expect(getProject('pooledidle01')?.orgId).toBe('org-1');
  });

  it('falls back to a cold create when the pool is empty', async () => {
    const used = deps();

    const project = await createProject({ name: 'cold', orgId: 'org-1' }, used);

    expect(project.status).toBe('running');
    expect(project.orgId).toBe('org-1');
    expect(used.createAndStart).toHaveBeenCalledOnce();
    expect(used.waitHealthy).toHaveBeenCalledWith(project.id);
    expect(getProject(project.id)?.status).toBe('running');
    expect(used.replenish).toHaveBeenCalledOnce();
  });

  it('deletes the claimed release when saving the project record fails', async () => {
    const used = deps({
      acquire: async (commit) => {
        const slot = {
          id: 'pooledidle01',
          createdAt: '2026-11-11T00:00:00.000Z',
        };
        await commit(slot);
        return slot;
      },
    });
    const saveError = new Error('disk full');
    vi.spyOn(await import('./registry.js'), 'upsertProject').mockImplementation(
      () => {
        throw saveError;
      }
    );

    await expect(
      createProject({ name: 'from pool', orgId: 'org-1' }, used)
    ).rejects.toThrow('disk full');
    expect(used.removeRelease).toHaveBeenCalledWith('pooledidle01');
    expect(getProject('pooledidle01')).toBeNull();
  });
});
