import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createPoolEngine,
  type PoolCluster,
  type PoolDeployment,
} from './pool.js';

const HASH = 'tmpl-current';
const OTHER = 'tmpl-stale';

function slot(
  id: string,
  pool: 'creating' | 'idle' | null = 'idle',
  templateHash = HASH,
  createdAt = '2026-11-11T00:00:00.000Z'
): PoolDeployment {
  return { id, pool, templateHash, ready: true, createdAt };
}

function memoryCluster(seed: PoolDeployment[] = []): PoolCluster & {
  deployments: PoolDeployment[];
  deleted: string[];
  created: string[];
} {
  const deployments = [...seed];
  const deleted: string[] = [];
  const created: string[] = [];
  return {
    deployments,
    deleted,
    created,
    async list() {
      return deployments.map((item) => ({ ...item }));
    },
    async create(id: string, templateHash: string) {
      created.push(id);
      deployments.push(
        slot(id, 'creating', templateHash, '2026-11-11T00:05:00.000Z')
      );
    },
    async markIdle(id: string) {
      const found = deployments.find((item) => item.id === id);
      if (found) found.pool = 'idle';
    },
    async clearPoolLabel(id: string) {
      const found = deployments.find((item) => item.id === id);
      if (found) found.pool = null;
    },
    async deleteRelease(id: string) {
      deleted.push(id);
      const index = deployments.findIndex((item) => item.id === id);
      if (index >= 0) deployments.splice(index, 1);
    },
    async isHealthy() {
      return true;
    },
  };
}

describe('pod pool engine', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function engineFor(
    cluster: PoolCluster,
    options: {
      poolSize?: number;
      now?: string;
      healthy?: (id: string) => boolean | Promise<boolean>;
      projects?: Set<string>;
      ids?: string[];
      slotsPath?: string;
      tracked?: string[];
    } = {}
  ) {
    const dir = options.slotsPath
      ? ''
      : mkdtempSync(join(tmpdir(), 'pod-pool-'));
    if (dir) dirs.push(dir);
    const slotsPath = options.slotsPath ?? join(dir, 'pool.json');
    let clock = options.now ?? '2026-11-11T00:10:00.000Z';
    const ids = [...(options.ids ?? [])];
    const projects = options.projects ?? new Set<string>();
    const engine = createPoolEngine({
      cluster: {
        ...cluster,
        async isHealthy(id: string) {
          if (options.healthy) return options.healthy(id);
          return cluster.isHealthy(id);
        },
      },
      poolSize: () => options.poolSize ?? 1,
      templateHash: () => HASH,
      slotsPath,
      now: () => new Date(clock),
      createId: () => {
        const id = ids.shift();
        if (!id) throw new Error('test ran out of ids');
        return id;
      },
      hasProject: (id) => projects.has(id),
      trackRelease: (item) => {
        options.tracked?.push(item.id);
      },
    });
    return { engine, slotsPath };
  }

  it('claims a healthy idle pod and drops it from the pool', async () => {
    const cluster = memoryCluster([slot('idle-1')]);
    const { engine } = engineFor(cluster, { poolSize: 1, ids: ['next-1'] });

    const claimed = await engine.acquire();

    expect(claimed).toEqual({
      id: 'idle-1',
      createdAt: '2026-11-11T00:00:00.000Z',
    });
    expect(engine.status()).toEqual({ target: 1, idle: 0, creating: 0 });
    expect(cluster.deployments.find((item) => item.id === 'idle-1')?.pool).toBe(
      null
    );
  });

  it('deletes an idle pod that fails health and tries the next one', async () => {
    const cluster = memoryCluster([
      slot('sick', 'idle', HASH, '2026-11-11T00:00:00.000Z'),
      slot('good', 'idle', HASH, '2026-11-11T00:01:00.000Z'),
    ]);
    const { engine } = engineFor(cluster, {
      poolSize: 2,
      healthy: async (id) => id !== 'sick',
    });

    const claimed = await engine.acquire();

    expect(claimed?.id).toBe('good');
    expect(cluster.deleted).toEqual(['sick']);
  });

  it('does not claim a creating pod or a stale template', async () => {
    const cluster = memoryCluster([
      slot('still-booting', 'creating'),
      slot('old-image', 'idle', OTHER),
    ]);
    const { engine } = engineFor(cluster);

    expect(await engine.acquire()).toBeNull();
    expect(cluster.deleted).toEqual([]);
  });

  it('lets only one of two concurrent acquires take the idle pod', async () => {
    const cluster = memoryCluster([slot('only')]);
    let releaseHealth: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseHealth = resolve;
    });
    let entered = false;
    let secondListedWhileHeld = false;
    const { engine } = engineFor(
      {
        ...cluster,
        async list() {
          if (entered) secondListedWhileHeld = true;
          return cluster.list();
        },
        async isHealthy() {
          if (!entered) {
            entered = true;
            await gate;
          }
          return true;
        },
      },
      { poolSize: 1 }
    );

    const first = engine.acquire();
    await viWaitUntil(() => entered);
    const second = engine.acquire();
    await Promise.resolve();
    expect(secondListedWhileHeld).toBe(false);
    releaseHealth?.();
    const results = await Promise.all([first, second]);

    const ids = results.map((item) => item?.id ?? null);
    expect(ids.filter((id) => id !== null)).toEqual(['only']);
    expect(ids.filter((id) => id === null)).toHaveLength(1);
  });

  it('fills up to the target and promotes a healthy creating pod to idle', async () => {
    const cluster = memoryCluster();
    const { engine, slotsPath } = engineFor(cluster, {
      poolSize: 1,
      ids: ['new-1'],
      healthy: () => false,
    });

    const created = await engine.reconcile();

    expect(created.createdIds).toEqual(['new-1']);
    expect(engine.status()).toEqual({ target: 1, idle: 0, creating: 1 });
    expect(cluster.created).toEqual(['new-1']);

    const { engine: healthyEngine } = engineFor(cluster, {
      poolSize: 1,
      ids: ['should-not-create'],
      healthy: () => true,
      slotsPath,
    });
    await healthyEngine.reconcile();

    expect(cluster.deployments[0]?.pool).toBe('idle');
    expect(healthyEngine.status().idle).toBe(1);
  });

  it('drops a stale idle pod and a creating pod that stays unhealthy for 3 minutes', async () => {
    const cluster = memoryCluster([
      slot('stale', 'idle', OTHER, '2026-11-11T00:00:00.000Z'),
      slot('stuck', 'creating', HASH, '2026-11-11T00:00:00.000Z'),
    ]);
    const { engine } = engineFor(cluster, {
      poolSize: 1,
      ids: ['fresh'],
      now: '2026-11-11T00:04:00.000Z',
      healthy: () => false,
    });

    await engine.reconcile();

    expect(cluster.deleted.sort()).toEqual(['stale', 'stuck']);
    expect(cluster.created).toEqual(['fresh']);
    expect(engine.status()).toEqual({ target: 1, idle: 0, creating: 1 });
  });

  it('keeps a creating pod that becomes healthy at the timeout boundary', async () => {
    const cluster = memoryCluster([
      slot('late', 'creating', HASH, '2026-11-11T00:00:00.000Z'),
    ]);
    const { engine } = engineFor(cluster, {
      poolSize: 1,
      now: '2026-11-11T00:04:00.000Z',
      healthy: () => true,
    });

    await engine.reconcile();

    expect(cluster.deleted).toEqual([]);
    expect(cluster.deployments[0]?.pool).toBe('idle');
  });

  it('clears pool labels on a deployment that is already a project and does not delete it', async () => {
    const cluster = memoryCluster([slot('owned')]);
    const { engine } = engineFor(cluster, {
      poolSize: 1,
      ids: ['replacement'],
      projects: new Set(['owned']),
    });

    await engine.reconcile();

    expect(cluster.deleted).toEqual([]);
    expect(cluster.deployments.find((item) => item.id === 'owned')?.pool).toBe(
      null
    );
    expect(cluster.created).toEqual(['replacement']);
  });

  it('tracks a deployment that is neither a project nor a pool pod', async () => {
    const cluster = memoryCluster([
      slot('orphan', null, '', '2026-11-11T00:00:00.000Z'),
      slot('keep-idle', 'idle', HASH, '2026-11-11T00:01:00.000Z'),
    ]);
    const tracked: string[] = [];
    const { engine } = engineFor(cluster, {
      poolSize: 1,
      ids: ['should-not-create'],
      tracked,
    });

    await engine.reconcile();

    expect(tracked).toEqual(['orphan']);
    expect(cluster.deleted).toEqual([]);
    expect(cluster.deployments.map((item) => item.id)).toEqual([
      'orphan',
      'keep-idle',
    ]);
    expect(cluster.created).toEqual([]);
    expect(engine.status()).toEqual({ target: 1, idle: 1, creating: 0 });
  });

  it('drops idle pods above the target and keeps the oldest', async () => {
    const cluster = memoryCluster([
      slot('older', 'idle', HASH, '2026-11-11T00:00:00.000Z'),
      slot('newer', 'idle', HASH, '2026-11-11T00:02:00.000Z'),
    ]);
    const { engine } = engineFor(cluster, {
      poolSize: 1,
      ids: ['should-not-create'],
    });

    await engine.reconcile();

    expect(cluster.deleted).toEqual(['newer']);
    expect(cluster.created).toEqual([]);
    expect(engine.status()).toEqual({ target: 1, idle: 1, creating: 0 });
  });

  it('deletes idle pods when the pool is turned off and does not claim them', async () => {
    const cluster = memoryCluster([slot('idle-1')]);
    const { engine } = engineFor(cluster, { poolSize: 0 });

    expect(await engine.acquire()).toBeNull();
    await engine.reconcile();

    expect(cluster.deleted).toEqual(['idle-1']);
    expect(engine.status()).toEqual({ target: 0, idle: 0, creating: 0 });
  });
});

async function viWaitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 1000) {
      throw new Error('timed out waiting for predicate');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
