import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { config } from './config.js';
import {
  createAndStartContainer,
  removeContainer,
  startContainer,
  stopContainer,
  waitForAgentHealth,
} from './docker.js';
import {
  deleteProject,
  getProject,
  listProjects,
  type ProjectRecord,
  projectUrls,
  upsertProject,
} from './registry.js';

function volumePathFor(projectId: string): string {
  return join(config.dataDir, 'volumes', projectId);
}

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

export async function createProject(input: {
  name?: string;
}): Promise<ReturnType<typeof toPublicProject>> {
  const id = nanoid(12).toLowerCase().replace(/_/g, 'x');
  const now = new Date().toISOString();
  const volumePath = volumePathFor(id);
  mkdirSync(volumePath, { recursive: true });
  mkdirSync(join(volumePath, '.sandbox'), { recursive: true });

  const record: ProjectRecord = {
    id,
    name: input.name?.trim() || `project-${id.slice(0, 6)}`,
    containerName: `as-agent-${id}`,
    volumePath,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  upsertProject(record);

  try {
    await createAndStartContainer({ projectId: id, volumePath });
    await waitForAgentHealth(record.containerName);
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
    await startContainer(record.containerName);
    await waitForAgentHealth(record.containerName);
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

  await stopContainer(record.containerName);
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

  await removeContainer(record.containerName);
  rmSync(record.volumePath, { recursive: true, force: true });
  deleteProject(projectId);
}
