import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import {
  createAndStartRelease,
  removeRelease,
  startRelease,
  stopRelease,
  waitForAgentHealth,
} from './k8s/runtime.js';
import { releaseNameFor, workspaceHostPath } from './k8s/resources.js';
import { acquireIdle, newProjectId, scheduleReplenish } from './pool.js';
import {
  deleteProject,
  getProject,
  listProjects,
  type ProjectRecord,
  projectUrls,
  upsertProject,
} from './registry.js';

function volumeRoot(): string {
  if (process.env.WORKSPACE_HOST_ROOT) {
    return process.env.WORKSPACE_HOST_ROOT.replace(/\/$/, '');
  }
  return join(process.env.POD_DATA_DIR || config.dataDir, 'volumes');
}

function volumePathFor(projectId: string): string {
  return workspaceHostPath(projectId, volumeRoot());
}

export interface CreateProjectDeps {
  acquire: () => Promise<{ id: string; createdAt: string } | null>;
  createAndStart: (projectId: string) => Promise<void>;
  waitHealthy: (projectId: string) => Promise<void>;
  removeRelease: (projectId: string) => Promise<void>;
  replenish: () => void;
}

const defaultCreateDeps: CreateProjectDeps = {
  acquire: () => acquireIdle(),
  createAndStart: async (projectId) => {
    await createAndStartRelease({ projectId });
  },
  waitHealthy: (projectId) => waitForAgentHealth(projectId),
  removeRelease: (projectId) => removeRelease(projectId),
  replenish: () => scheduleReplenish(),
};

export function toPublicProject(record: ProjectRecord) {
  const urls = projectUrls(record.id);
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    agentUrl: urls.agentUrl,
    previewUrl: urls.previewUrl,
    lastError: record.lastError,
  };
}

export function listPublicProjects() {
  return listProjects().map(toPublicProject);
}

export async function createProject(
  input: { name?: string },
  deps: CreateProjectDeps = defaultCreateDeps
): Promise<ReturnType<typeof toPublicProject>> {
  try {
    const claimed = await deps.acquire();
    if (claimed) {
      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: claimed.id,
        name: input.name?.trim() || `project-${claimed.id.slice(0, 6)}`,
        releaseName: releaseNameFor(claimed.id),
        volumePath: volumePathFor(claimed.id),
        status: 'running',
        createdAt: now,
        updatedAt: now,
      };
      try {
        upsertProject(record);
      } catch (error) {
        await deps.removeRelease(claimed.id);
        rmSync(record.volumePath, { recursive: true, force: true });
        throw error;
      }
      return toPublicProject(record);
    }

    const id = newProjectId();
    const now = new Date().toISOString();
    const volumePath = volumePathFor(id);
    mkdirSync(volumePath, { recursive: true });
    mkdirSync(join(volumePath, '.sandbox'), { recursive: true });

    const record: ProjectRecord = {
      id,
      name: input.name?.trim() || `project-${id.slice(0, 6)}`,
      releaseName: releaseNameFor(id),
      volumePath,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    upsertProject(record);

    try {
      await deps.createAndStart(id);
      await deps.waitHealthy(id);
      record.status = 'running';
      record.updatedAt = new Date().toISOString();
      upsertProject(record);
      return toPublicProject(record);
    } catch (error) {
      record.status = 'error';
      record.lastError = error instanceof Error ? error.message : String(error);
      record.updatedAt = new Date().toISOString();
      upsertProject(record);
      throw error;
    }
  } finally {
    deps.replenish();
  }
}

export async function ensureReady(
  projectId: string
): Promise<ReturnType<typeof toPublicProject>> {
  const record = getProject(projectId);
  if (!record) {
    throw Object.assign(new Error(`Project not found: ${projectId}`), {
      status: 404,
    });
  }

  try {
    await startRelease(projectId);
    await waitForAgentHealth(projectId);
    record.status = 'running';
    record.lastError = undefined;
    record.updatedAt = new Date().toISOString();
    upsertProject(record);
    return toPublicProject(record);
  } catch (error) {
    record.status = 'error';
    record.lastError = error instanceof Error ? error.message : String(error);
    record.updatedAt = new Date().toISOString();
    upsertProject(record);
    throw error;
  }
}

export async function stopProject(
  projectId: string
): Promise<ReturnType<typeof toPublicProject>> {
  const record = getProject(projectId);
  if (!record) {
    throw Object.assign(new Error(`Project not found: ${projectId}`), {
      status: 404,
    });
  }

  await stopRelease(projectId);
  record.status = 'stopped';
  record.updatedAt = new Date().toISOString();
  upsertProject(record);
  return toPublicProject(record);
}

export async function destroyProject(projectId: string): Promise<void> {
  const record = getProject(projectId);
  if (!record) {
    throw Object.assign(new Error(`Project not found: ${projectId}`), {
      status: 404,
    });
  }

  await removeRelease(projectId);
  rmSync(record.volumePath, { recursive: true, force: true });
  deleteProject(projectId);
}
