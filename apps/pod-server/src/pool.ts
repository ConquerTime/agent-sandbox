import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { nanoid } from 'nanoid';
import { config } from './config.js';
import { dbHasProject, usingDatabase } from './db.js';
import {
  applyPoolLabel,
  createAndStartRelease,
  currentTemplateHash,
  listPoolDeployments,
  probeAgentHealth,
  removeRelease,
  waitForAgentHealth,
} from './k8s/runtime.js';
import { releaseNameFor, workspaceHostPath } from './k8s/resources.js';
import { getProject, upsertProject, type ProjectRecord } from './registry.js';

const CREATING_TIMEOUT_MS = 3 * 60 * 1000;

export interface PoolDeployment {
  id: string;
  /** `null` means the Deployment is not a pool member (claimed, or an orphan). */
  pool: 'creating' | 'idle' | null;
  templateHash: string;
  ready: boolean;
  createdAt: string;
}

export interface PoolCluster {
  list(): Promise<PoolDeployment[]>;
  create(id: string, templateHash: string): Promise<void>;
  markIdle(id: string): Promise<void>;
  clearPoolLabel(id: string): Promise<void>;
  deleteRelease(id: string): Promise<void>;
  isHealthy(id: string): Promise<boolean>;
}

interface PoolSlot {
  id: string;
  state: 'creating' | 'idle';
  templateHash: string;
  createdAt: string;
}

export interface PoolEngine {
  acquire(
    commit?: (claimed: { id: string; createdAt: string }) => Promise<void>
  ): Promise<{ id: string; createdAt: string } | null>;
  reconcile(): Promise<{ createdIds: string[] }>;
  discard(id: string): Promise<void>;
  status(): { target: number; idle: number; creating: number };
}

export function newProjectId(): string {
  return nanoid(12).toLowerCase().replace(/_/g, 'x');
}

export function createPoolEngine(options: {
  cluster: PoolCluster;
  poolSize: () => number;
  templateHash: () => string;
  slotsPath: string;
  now?: () => Date;
  createId?: () => string;
  hasProject?: (id: string) => boolean;
  /** Deployment with no pool label and no registry row. Default keeps it. */
  trackRelease?: (item: PoolDeployment) => void;
}): PoolEngine {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? newProjectId;
  const hasProject = options.hasProject ?? (() => false);
  let tail: Promise<void> = Promise.resolve();

  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function readSlots(): PoolSlot[] {
    try {
      const parsed = JSON.parse(readFileSync(options.slotsPath, 'utf8')) as {
        slots?: PoolSlot[];
      };
      return parsed.slots ?? [];
    } catch {
      return [];
    }
  }

  function writeSlots(slots: PoolSlot[]): void {
    mkdirSync(dirname(options.slotsPath), { recursive: true });
    writeFileSync(
      options.slotsPath,
      JSON.stringify({ slots }, null, 2)
    );
  }

  async function syncSlots(): Promise<void> {
    const hash = options.templateHash();
    const items = await options.cluster.list();
    writeSlots(
      items
        .filter(
          (item) =>
            (item.pool === 'creating' || item.pool === 'idle') &&
            item.templateHash === hash
        )
        .map((item) => ({
          id: item.id,
          state: item.pool as 'creating' | 'idle',
          templateHash: item.templateHash,
          createdAt: item.createdAt,
        }))
    );
  }

  return {
    acquire(commit) {
      return withLock(async () => {
        if (options.poolSize() <= 0) return null;
        const hash = options.templateHash();
        const candidates = (await options.cluster.list())
          .filter(
            (item) =>
              item.pool === 'idle' &&
              item.templateHash === hash &&
              !hasProject(item.id)
          )
          .sort(
            (left, right) =>
              Date.parse(left.createdAt) - Date.parse(right.createdAt)
          );

        for (const item of candidates) {
          if (!(await options.cluster.isHealthy(item.id))) {
            await options.cluster.deleteRelease(item.id);
            continue;
          }
          const claimed = { id: item.id, createdAt: item.createdAt };
          await options.cluster.clearPoolLabel(item.id);
          try {
            // Registry write stays inside the lock. Otherwise reconcile can
            // see a Deployment with no pool label and no project, and delete it.
            await commit?.(claimed);
          } catch (error) {
            await options.cluster.deleteRelease(item.id);
            throw error;
          }
          try {
            await syncSlots();
          } catch (error) {
            // pool.json is rebuilt on the next reconcile. The claim is already
            // in the registry, so do not destroy the release.
            throw error;
          }
          return claimed;
        }

        await syncSlots();
        return null;
      });
    },

    reconcile() {
      return withLock(async () => {
        const target = Math.max(0, options.poolSize());
        const hash = options.templateHash();
        const createdIds: string[] = [];
        const kept: PoolSlot[] = [];

        for (const item of await options.cluster.list()) {
          if (hasProject(item.id)) {
            if (item.pool) await options.cluster.clearPoolLabel(item.id);
            continue;
          }
          // No pool label and no registry row: the list lost track of a live
          // Deployment (registry file not on the volume, or a crashed claim).
          // Put it back so it can be stopped or deleted. Do not remove it here;
          // the workspace may already hold a conversation.
          if (item.pool !== 'creating' && item.pool !== 'idle') {
            options.trackRelease?.(item);
            continue;
          }
          if (target === 0 || item.templateHash !== hash) {
            await options.cluster.deleteRelease(item.id);
            continue;
          }
          if (item.pool === 'creating') {
            const age = now().getTime() - Date.parse(item.createdAt);
            const healthy = await options.cluster.isHealthy(item.id);
            if (!healthy && age > CREATING_TIMEOUT_MS) {
              await options.cluster.deleteRelease(item.id);
              continue;
            }
            if (healthy) {
              await options.cluster.markIdle(item.id);
              kept.push({
                id: item.id,
                state: 'idle',
                templateHash: hash,
                createdAt: item.createdAt,
              });
              continue;
            }
            kept.push({
              id: item.id,
              state: 'creating',
              templateHash: hash,
              createdAt: item.createdAt,
            });
            continue;
          }
          kept.push({
            id: item.id,
            state: 'idle',
            templateHash: hash,
            createdAt: item.createdAt,
          });
        }

        kept.sort(
          (left, right) =>
            Date.parse(left.createdAt) - Date.parse(right.createdAt)
        );
        while (kept.length > target) {
          const extra = kept.pop();
          if (extra) await options.cluster.deleteRelease(extra.id);
        }

        while (kept.length < target) {
          const id = createId();
          const createdAt = now().toISOString();
          await options.cluster.create(id, hash);
          kept.push({
            id,
            state: 'creating',
            templateHash: hash,
            createdAt,
          });
          createdIds.push(id);
        }

        writeSlots(kept);
        return { createdIds };
      });
    },

    discard(id: string) {
      return withLock(async () => {
        if (hasProject(id)) return;
        await options.cluster.deleteRelease(id);
        writeSlots(readSlots().filter((slot) => slot.id !== id));
      });
    },

    status() {
      const hash = options.templateHash();
      const slots = readSlots();
      return {
        target: options.poolSize(),
        idle: slots.filter(
          (slot) => slot.state === 'idle' && slot.templateHash === hash
        ).length,
        creating: slots.filter(
          (slot) => slot.state === 'creating' && slot.templateHash === hash
        ).length,
      };
    },
  };
}

function slotsFile(): string {
  const root = process.env.POD_DATA_DIR || config.dataDir;
  return join(root, 'registry', 'pool.json');
}

const k8sCluster: PoolCluster = {
  list: () => listPoolDeployments(),
  async create(id, templateHash) {
    await createAndStartRelease({
      projectId: id,
      pool: {
        state: 'creating',
        templateHash,
        createdAt: new Date().toISOString(),
      },
    });
  },
  markIdle: (id) => applyPoolLabel(id, 'idle'),
  clearPoolLabel: (id) => applyPoolLabel(id, null),
  async deleteRelease(id) {
    await removeRelease(id);
    rmSync(workspaceHostPath(id, config.workspaceHostRoot), {
      recursive: true,
      force: true,
    });
  },
  isHealthy: (id) => probeAgentHealth(id),
};

let engine: PoolEngine | null = null;

function getEngine(): PoolEngine {
  if (!engine) {
    engine = createPoolEngine({
      cluster: k8sCluster,
      poolSize: () => config.poolSize,
      templateHash: () => currentTemplateHash(),
      slotsPath: slotsFile(),
      hasProject: (id) =>
        usingDatabase() ? dbHasProject(id) : getProject(id) !== null,
      trackRelease: (item) => {
        if (usingDatabase()) return;
        if (getProject(item.id)) return;
        const now = new Date().toISOString();
        const record: ProjectRecord = {
          id: item.id,
          name: `recovered-${item.id.slice(0, 6)}`,
          releaseName: releaseNameFor(item.id),
          volumePath: workspaceHostPath(item.id, config.workspaceHostRoot),
          status: item.ready ? 'running' : 'pending',
          createdAt: item.createdAt || now,
          updatedAt: now,
        };
        upsertProject(record);
      },
    });
  }
  return engine;
}

let inflight: Promise<void> | null = null;

export function scheduleReplenish(): void {
  if (inflight) return;
  inflight = replenish()
    .catch((error: unknown) => {
      console.error('[pool] replenish failed', error);
    })
    .finally(() => {
      inflight = null;
    });
}

async function replenish(): Promise<void> {
  // Each pass creates a deficit, then waits until those pods are healthy.
  // The next pass flips them to idle and replaces anything claimed meanwhile.
  for (let pass = 0; pass < 3; pass += 1) {
    const { createdIds } = await getEngine().reconcile();
    if (createdIds.length === 0) return;
    await promote(createdIds);
  }
  await getEngine().reconcile();
}

async function promote(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await waitForAgentHealth(id);
      } catch (error) {
        console.error(`[pool] health failed for ${id}`, error);
        await getEngine().discard(id);
      }
    })
  );
}

export function acquireIdle(
  commit?: (claimed: { id: string; createdAt: string }) => Promise<void>
): Promise<{ id: string; createdAt: string } | null> {
  return getEngine().acquire(commit);
}

export function poolStatus(): { target: number; idle: number; creating: number } {
  return getEngine().status();
}
