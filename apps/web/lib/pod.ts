const POD_SERVER_URL =
  process.env.POD_SERVER_URL || 'http://localhost:7000';

export interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  agentUrl: string;
  previewUrl: string;
  lastError?: string;
}

async function podFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${POD_SERVER_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        `pod-server error ${response.status}`
    );
  }
  return data;
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
