export function releaseNameFor(projectId: string): string {
  return `as-agent-${projectId}`;
}

export function pvcNameFor(projectId: string): string {
  return `${releaseNameFor(projectId)}-workspace`;
}

export function projectLabels(projectId: string): Record<string, string> {
  return {
    'app.kubernetes.io/name': 'agent-sandbox-agent',
    'app.kubernetes.io/instance': releaseNameFor(projectId),
    'agent-sandbox.project': projectId,
  };
}

export function workspaceHostPath(projectId: string, hostRoot: string): string {
  return `${hostRoot.replace(/\/$/, '')}/${projectId}`;
}
