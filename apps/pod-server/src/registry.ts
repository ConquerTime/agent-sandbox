import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';

export type ProjectStatus = 'running' | 'stopped' | 'pending' | 'error';

export interface ProjectRecord {
  id: string;
  name: string;
  containerName: string;
  volumePath: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

const registryPath = join(config.dataDir, 'registry', 'projects.json');

function ensureRegistryFile(): void {
  const dir = join(config.dataDir, 'registry');
  mkdirSync(dir, { recursive: true });
  if (!existsSync(registryPath)) {
    writeFileSync(registryPath, JSON.stringify({ projects: [] }, null, 2));
  }
}

function readAll(): ProjectRecord[] {
  ensureRegistryFile();
  const raw = readFileSync(registryPath, 'utf8');
  const parsed = JSON.parse(raw) as { projects: ProjectRecord[] };
  return parsed.projects ?? [];
}

function writeAll(projects: ProjectRecord[]): void {
  ensureRegistryFile();
  writeFileSync(registryPath, JSON.stringify({ projects }, null, 2));
}

export function listProjects(): ProjectRecord[] {
  return [...readAll()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
}

export function getProject(id: string): ProjectRecord | null {
  return readAll().find((project) => project.id === id) ?? null;
}

export function upsertProject(record: ProjectRecord): ProjectRecord {
  const projects = readAll();
  const index = projects.findIndex((project) => project.id === record.id);
  if (index >= 0) {
    projects[index] = record;
  } else {
    projects.push(record);
  }
  writeAll(projects);
  return record;
}

export function deleteProject(id: string): boolean {
  const projects = readAll();
  const next = projects.filter((project) => project.id !== id);
  if (next.length === projects.length) return false;
  writeAll(next);
  return true;
}

export function projectUrls(projectId: string) {
  const base = config.publicBaseUrl.replace(/\/$/, '');
  return {
    agentUrl: `${base}/p/${projectId}/agent`,
    previewUrl: `${base}/p/${projectId}/preview`,
  };
}
