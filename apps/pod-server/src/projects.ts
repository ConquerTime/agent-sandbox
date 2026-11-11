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
import {
  dbDeleteProject,
  dbGetProjectForOrg,
  dbListProjects,
  dbUpsertProject,
  usingDatabase,
} from './db.js';
import { acquireIdle, newProjectId, scheduleReplenish } from './pool.js';
import {
  deleteProject,
  getProject,
  getProjectForOrg,
  listProjectsForOrg,
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

async function saveRecord(record: ProjectRecord): Promise<ProjectRecord> {
  if (usingDatabase()) return dbUpsertProject(record);
  return upsertProject(record);
}

async function loadForOrg(
  projectId: string,
  orgId: string
): Promise<ProjectRecord | null> {
  if (usingDatabase()) return dbGetProjectForOrg(projectId, orgId);
  return getProjectForOrg(projectId, orgId);
}

function notFound(projectId: string): Error {
  return Object.assign(new Error(`Project not found: ${projectId}`), {
    status: 404,
  });
}

export interface CreateProjectDeps {
  acquire: (
    commit: (claimed: { id: string; createdAt: string }) => Promise<void>
  ) => Promise<{ id: string; createdAt: string } | null>;
  createAndStart: (projectId: string) => Promise<void>;
  waitHealthy: (projectId: string) => Promise<void>;
  removeRelease: (projectId: string) => Promise<void>;
  replenish: () => void;
}

const defaultCreateDeps: CreateProjectDeps = {
  acquire: (commit) => acquireIdle(commit),
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
    orgId: record.orgId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    agentUrl: urls.agentUrl,
    previewUrl: urls.previewUrl,
    lastError: record.lastError,
  };
}

export async function listPublicProjects(orgId: string) {
  const records = usingDatabase()
    ? await dbListProjects(orgId)
    : listProjectsForOrg(orgId);
  return records.map(toPublicProject);
}

export async function createProject(
  input: { name?: string; orgId: string },
  deps: CreateProjectDeps = defaultCreateDeps
): Promise<ReturnType<typeof toPublicProject>> {
  if (!input.orgId) {
    throw Object.assign(new Error('orgId is required'), { status: 400 });
  }

  try {
    let saved: ProjectRecord | null = null;
    const claimed = await deps.acquire(async (slot) => {
      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: slot.id,
        name: input.name?.trim() || `project-${slot.id.slice(0, 6)}`,
        orgId: input.orgId,
        releaseName: releaseNameFor(slot.id),
        volumePath: volumePathFor(slot.id),
        status: 'running',
        createdAt: now,
        updatedAt: now,
      };
      try {
        await saveRecord(record);
        saved = record;
      } catch (error) {
        await deps.removeRelease(slot.id);
        rmSync(record.volumePath, { recursive: true, force: true });
        throw error;
      }
    });
    if (claimed && saved) {
      return toPublicProject(saved);
    }

    const id = newProjectId();
    const now = new Date().toISOString();
    const volumePath = volumePathFor(id);
    mkdirSync(volumePath, { recursive: true });
    mkdirSync(join(volumePath, '.sandbox'), { recursive: true });

    const record: ProjectRecord = {
      id,
      name: input.name?.trim() || `project-${id.slice(0, 6)}`,
      orgId: input.orgId,
      releaseName: releaseNameFor(id),
      volumePath,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await saveRecord(record);

    try {
      await deps.createAndStart(id);
      await deps.waitHealthy(id);
      record.status = 'running';
      record.updatedAt = new Date().toISOString();
      await saveRecord(record);
      return toPublicProject(record);
    } catch (error) {
      record.status = 'error';
      record.lastError = error instanceof Error ? error.message : String(error);
      record.updatedAt = new Date().toISOString();
      await saveRecord(record);
      throw error;
    }
  } finally {
    deps.replenish();
  }
}

export async function ensureReady(
  projectId: string,
  orgId?: string
): Promise<ReturnType<typeof toPublicProject>> {
  const record = orgId
    ? await loadForOrg(projectId, orgId)
    : getProject(projectId);
  if (!record || (orgId && record.orgId !== orgId)) {
    throw notFound(projectId);
  }

  try {
    await startRelease(projectId);
    await waitForAgentHealth(projectId);
    record.status = 'running';
    record.lastError = undefined;
    record.updatedAt = new Date().toISOString();
    await saveRecord(record);
    return toPublicProject(record);
  } catch (error) {
    record.status = 'error';
    record.lastError = error instanceof Error ? error.message : String(error);
    record.updatedAt = new Date().toISOString();
    await saveRecord(record);
    throw error;
  }
}

export async function stopProject(
  projectId: string,
  orgId: string
): Promise<ReturnType<typeof toPublicProject>> {
  const record = await loadForOrg(projectId, orgId);
  if (!record) {
    throw notFound(projectId);
  }

  await stopRelease(projectId);
  record.status = 'stopped';
  record.updatedAt = new Date().toISOString();
  await saveRecord(record);
  return toPublicProject(record);
}

export async function destroyProject(
  projectId: string,
  orgId: string
): Promise<void> {
  const record = await loadForOrg(projectId, orgId);
  if (!record) {
    throw notFound(projectId);
  }

  await removeRelease(projectId);
  rmSync(record.volumePath, { recursive: true, force: true });
  const canonical = volumePathFor(projectId);
  if (canonical !== record.volumePath) {
    rmSync(canonical, { recursive: true, force: true });
  }
  if (usingDatabase()) await dbDeleteProject(projectId);
  else deleteProject(projectId);
}

export async function getPublicProjectForOrg(projectId: string, orgId: string) {
  const record = await loadForOrg(projectId, orgId);
  if (!record) return null;
  return toPublicProject(record);
}
