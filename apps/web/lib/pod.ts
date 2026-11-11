import { getSessionToken } from './session';

const POD_SERVER_URL =
  process.env.POD_SERVER_URL || 'http://127.0.0.1:7000';

export interface Project {
  id: string;
  name: string;
  orgId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  agentUrl: string;
  previewUrl: string;
  lastError?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: 'owner' | 'member';
  orgName: string;
}

async function withAuthHeaders(
  extra?: HeadersInit,
  options?: { json?: boolean }
): Promise<Headers> {
  const headers = new Headers(extra);
  if (options?.json && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = await getSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export async function podFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${POD_SERVER_URL}${path}`, {
    ...init,
    headers: await withAuthHeaders(init?.headers, { json: true }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(
      new Error(
        (data as { error?: string }).error ||
          `pod-server error ${response.status}`
      ),
      { status: response.status }
    );
  }
  return data;
}

export async function podFetchRaw(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${POD_SERVER_URL}${path}`, {
    ...init,
    headers: await withAuthHeaders(init?.headers),
    cache: 'no-store',
  });
}

export async function listProjects(): Promise<Project[]> {
  const data = (await podFetch('/api/projects')) as { projects: Project[] };
  return data.projects;
}

export async function createProject(name?: string): Promise<Project> {
  const data = (await podFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })) as { project: Project };
  return data.project;
}

export async function readyProject(id: string): Promise<Project> {
  const data = (await podFetch(`/api/projects/${id}/ready`)) as {
    project: Project;
  };
  return data.project;
}

export async function stopProject(id: string): Promise<Project> {
  const data = (await podFetch(`/api/projects/${id}/stop`, {
    method: 'POST',
  })) as { project: Project };
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  await podFetch(`/api/projects/${id}`, { method: 'DELETE' });
}

export function getPodServerUrl() {
  return POD_SERVER_URL;
}
