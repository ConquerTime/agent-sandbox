import { getPodServerUrl, podFetchRaw, readyProject } from './pod';

export async function proxyToAgent(
  projectId: string,
  agentPath: string,
  init?: RequestInit
): Promise<Response> {
  await readyProject(projectId);
  return podFetchRaw(`/p/${projectId}/agent${agentPath}`, init);
}

export async function proxyToPreview(
  projectId: string,
  previewPath: string,
  request: Request
): Promise<Response> {
  await readyProject(projectId);
  const incoming = new URL(request.url);
  const targetPath = `/p/${projectId}/preview${previewPath}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    Object.assign(init, { duplex: 'half' });
  }

  return podFetchRaw(targetPath, init);
}

export function getPodBase() {
  return getPodServerUrl();
}
