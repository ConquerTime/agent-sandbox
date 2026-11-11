import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import type * as k8s from '@kubernetes/client-node';
import { config } from '../config.js';
import { getAppsApi, getCoreApi } from './client.js';
import {
  projectLabels,
  pvcNameFor,
  releaseNameFor,
  workspaceHostPath,
} from './resources.js';

function ns(): string {
  return config.k8sNamespace;
}

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as {
    code?: number;
    response?: { statusCode?: number };
    statusCode?: number;
  };
  return err.code ?? err.statusCode ?? err.response?.statusCode;
}

function isNotFound(error: unknown): boolean {
  return httpStatus(error) === 404;
}

export function serviceDns(projectId: string): string {
  return `${releaseNameFor(projectId)}.${ns()}.svc.cluster.local`;
}

export function resolveUpstreamBase(
  projectId: string,
  kind: 'agent' | 'preview'
): string {
  const port = kind === 'agent' ? config.agentPort : config.previewPort;
  return `http://${serviceDns(projectId)}:${port}`;
}

function buildPvc(projectId: string): k8s.V1PersistentVolumeClaim {
  return {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: pvcNameFor(projectId),
      namespace: ns(),
      labels: projectLabels(projectId),
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      storageClassName: '',
      volumeName: `pv-${releaseNameFor(projectId)}`,
      resources: {
        requests: {
          storage: '5Gi',
        },
      },
    },
  };
}

function buildPv(projectId: string): k8s.V1PersistentVolume {
  const path = workspaceHostPath(projectId, config.workspaceHostRoot);
  return {
    apiVersion: 'v1',
    kind: 'PersistentVolume',
    metadata: {
      name: `pv-${releaseNameFor(projectId)}`,
      labels: projectLabels(projectId),
    },
    spec: {
      capacity: { storage: '5Gi' },
      accessModes: ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: 'Retain',
      storageClassName: '',
      hostPath: {
        path,
        type: 'DirectoryOrCreate',
      },
    },
  };
}

function buildService(projectId: string): k8s.V1Service {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: releaseNameFor(projectId),
      namespace: ns(),
      labels: projectLabels(projectId),
    },
    spec: {
      type: 'ClusterIP',
      selector: projectLabels(projectId),
      ports: [
        {
          name: 'agent',
          port: config.agentPort,
          targetPort: config.agentPort,
        },
        {
          name: 'preview',
          port: config.previewPort,
          targetPort: config.previewPort,
        },
      ],
    },
  };
}

export function isAgentDevMountEnabled(): boolean {
  return Boolean(config.agentDevRoot);
}

/** Volume / mount / command fragments used when AGENT_DEV_ROOT is set. */
export function agentDevMountSpec(devRoot: string): {
  volumes: k8s.V1Volume[];
  volumeMounts: k8s.V1VolumeMount[];
  command: string[];
} {
  const root = devRoot.replace(/\/$/, '');
  return {
    volumes: [
      {
        name: 'agent-src',
        hostPath: {
          path: `${root}/apps/agent/src`,
          type: 'Directory',
        },
      },
      {
        name: 'shared-src',
        hostPath: {
          path: `${root}/packages/shared`,
          type: 'Directory',
        },
      },
    ],
    volumeMounts: [
      {
        name: 'agent-src',
        mountPath: '/app/apps/agent/src',
        readOnly: true,
      },
      {
        name: 'shared-src',
        mountPath: '/app/packages/shared',
        readOnly: true,
      },
    ],
    command: ['node', 'src/dev-supervisor.mjs'],
  };
}

export const POOL_LABEL = 'agent-sandbox.pool';
export const TEMPLATE_LABEL = 'agent-sandbox.template';
export const POOL_CREATED_ANNOTATION = 'agent-sandbox.pool/created-at';

export type PoolDeploymentMeta = {
  state: 'creating' | 'idle';
  templateHash: string;
  createdAt: string;
};

export function deploymentTemplateHash(dep: k8s.V1Deployment): string {
  const container = dep.spec?.template?.spec?.containers?.[0];
  const extraVolumes = (dep.spec?.template?.spec?.volumes ?? [])
    .filter((volume) => volume.name !== 'workspace')
    .map((volume) => `${volume.name}:hp=${volume.hostPath?.path ?? ''}`)
    .sort()
    .join('|');
  const envFrom = (container?.envFrom ?? [])
    .map((source) => source.secretRef?.name ?? source.configMapRef?.name ?? '')
    .sort()
    .join(',');
  const key = [
    container?.image ?? '',
    commandKey(container?.command),
    sortedMountKey(container?.volumeMounts),
    extraVolumes,
    envFrom,
  ].join('\n');
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function currentTemplateHash(): string {
  return deploymentTemplateHash(buildDeployment('template'));
}

export function buildDeployment(
  projectId: string,
  pool?: PoolDeploymentMeta
): k8s.V1Deployment {
  const selectorLabels = projectLabels(projectId);
  const labels = { ...selectorLabels };
  const volumeMounts: k8s.V1VolumeMount[] = [
    {
      name: 'workspace',
      mountPath: '/workspace',
    },
  ];
  const volumes: k8s.V1Volume[] = [
    {
      name: 'workspace',
      persistentVolumeClaim: {
        claimName: pvcNameFor(projectId),
      },
    },
  ];

  const container: k8s.V1Container = {
    name: 'agent',
    image: config.agentImage,
    imagePullPolicy: 'IfNotPresent',
    ports: [
      { name: 'agent', containerPort: config.agentPort },
      { name: 'preview', containerPort: config.previewPort },
    ],
    env: [
      { name: 'WORKSPACE_DIR', value: '/workspace' },
      { name: 'AGENT_PORT', value: String(config.agentPort) },
      { name: 'PREVIEW_PORT', value: String(config.previewPort) },
      { name: 'PROJECT_ID', value: projectId },
    ],
    envFrom: [
      {
        secretRef: {
          name: config.agentEnvSecret,
          optional: true,
        },
      },
      {
        secretRef: {
          name: 'sandbox-data',
          optional: true,
        },
      },
    ],
    volumeMounts,
    readinessProbe: {
      httpGet: {
        path: '/api/health',
        port: 'agent',
      },
      initialDelaySeconds: 2,
      periodSeconds: 3,
    },
    resources: {
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { memory: '2Gi' },
    },
  };

  if (config.agentDevRoot) {
    const dev = agentDevMountSpec(config.agentDevRoot);
    volumeMounts.push(...dev.volumeMounts);
    volumes.push(...dev.volumes);
    container.command = dev.command;
  }

  if (pool) {
    labels[POOL_LABEL] = pool.state;
    labels[TEMPLATE_LABEL] = pool.templateHash;
  }

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: releaseNameFor(projectId),
      namespace: ns(),
      labels,
      ...(pool
        ? { annotations: { [POOL_CREATED_ANNOTATION]: pool.createdAt } }
        : {}),
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: selectorLabels },
      template: {
        metadata: { labels: selectorLabels },
        spec: {
          containers: [container],
          volumes,
        },
      },
    },
  };
}

function sortedMountKey(mounts: k8s.V1VolumeMount[] | undefined): string {
  return (mounts ?? [])
    .map((m) => `${m.name}:${m.mountPath}:${m.readOnly ? 'ro' : 'rw'}`)
    .sort()
    .join('|');
}

function sortedVolumeKey(volumes: k8s.V1Volume[] | undefined): string {
  return (volumes ?? [])
    .map((v) => {
      const host = v.hostPath?.path ?? '';
      const pvc = v.persistentVolumeClaim?.claimName ?? '';
      return `${v.name}:hp=${host}:pvc=${pvc}`;
    })
    .sort()
    .join('|');
}

function commandKey(command: string[] | undefined): string {
  return (command ?? []).join('\0');
}

/** True when live Deployment pod template differs from the desired agent spec. */
export function deploymentNeedsReconcile(
  live: k8s.V1Deployment,
  desired: k8s.V1Deployment
): boolean {
  const liveContainer = live.spec?.template?.spec?.containers?.[0];
  const desiredContainer = desired.spec?.template?.spec?.containers?.[0];
  if (!liveContainer || !desiredContainer) return true;

  if (liveContainer.image !== desiredContainer.image) return true;
  if (commandKey(liveContainer.command) !== commandKey(desiredContainer.command)) {
    return true;
  }
  if (
    sortedMountKey(liveContainer.volumeMounts) !==
    sortedMountKey(desiredContainer.volumeMounts)
  ) {
    return true;
  }
  if (
    sortedVolumeKey(live.spec?.template?.spec?.volumes) !==
    sortedVolumeKey(desired.spec?.template?.spec?.volumes)
  ) {
    return true;
  }
  const envFromKey = (container: k8s.V1Container | undefined) =>
    (container?.envFrom ?? [])
      .map((source) => source.secretRef?.name ?? '')
      .sort()
      .join(',');
  if (envFromKey(liveContainer) !== envFromKey(desiredContainer)) return true;
  return false;
}

async function ensureDeployment(
  projectId: string,
  replicas = 1,
  pool?: PoolDeploymentMeta
): Promise<void> {
  const apps = getAppsApi();
  const name = releaseNameFor(projectId);
  const desired = buildDeployment(projectId, pool);
  desired.spec!.replicas = replicas;

  try {
    const live = await apps.readNamespacedDeployment({ name, namespace: ns() });
    if (deploymentNeedsReconcile(live, desired)) {
      desired.metadata = {
        ...desired.metadata,
        resourceVersion: live.metadata?.resourceVersion,
      };
      await apps.replaceNamespacedDeployment({
        name,
        namespace: ns(),
        body: desired,
      });
      return;
    }
    await scaleRelease(projectId, replicas);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await apps.createNamespacedDeployment({
      namespace: ns(),
      body: desired,
    });
  }
}

async function ensurePvPvc(projectId: string): Promise<void> {
  const core = getCoreApi();
  const path = workspaceHostPath(projectId, config.workspaceHostRoot);
  mkdirSync(path, { recursive: true });
  mkdirSync(`${path}/.sandbox`, { recursive: true });

  const pv = buildPv(projectId);
  try {
    await core.createPersistentVolume({ body: pv });
  } catch (error) {
    if (!isNotFound(error) && !isAlreadyExists(error)) throw error;
  }

  const pvc = buildPvc(projectId);
  try {
    await core.createNamespacedPersistentVolumeClaim({
      namespace: ns(),
      body: pvc,
    });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
}

function isAlreadyExists(error: unknown): boolean {
  return httpStatus(error) === 409;
}

export async function createAndStartRelease(options: {
  projectId: string;
  pool?: PoolDeploymentMeta;
}): Promise<string> {
  const { projectId } = options;
  const name = releaseNameFor(projectId);
  const core = getCoreApi();

  await ensurePvPvc(projectId);

  try {
    await core.createNamespacedService({
      namespace: ns(),
      body: buildService(projectId),
    });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }

  await ensureDeployment(projectId, 1, options.pool);

  return name;
}

export async function listPoolDeployments(): Promise<
  Array<{
    id: string;
    pool: 'creating' | 'idle';
    templateHash: string;
    ready: boolean;
    createdAt: string;
  }>
> {
  const apps = getAppsApi();
  const listed = await apps.listNamespacedDeployment({
    namespace: ns(),
    labelSelector: `${POOL_LABEL} in (creating,idle)`,
  });
  return (listed.items ?? []).flatMap((deployment) => {
    const labels = deployment.metadata?.labels ?? {};
    const pool = labels[POOL_LABEL];
    const id = labels['agent-sandbox.project'];
    if ((pool !== 'creating' && pool !== 'idle') || !id) return [];
    const readyReplicas = deployment.status?.readyReplicas ?? 0;
    const replicas = deployment.spec?.replicas ?? 0;
    return [
      {
        id,
        pool,
        templateHash: labels[TEMPLATE_LABEL] ?? '',
        ready: replicas > 0 && readyReplicas > 0,
        createdAt: annotationTime(deployment),
      },
    ];
  });
}

function annotationTime(deployment: k8s.V1Deployment): string {
  const raw = deployment.metadata?.annotations?.[POOL_CREATED_ANNOTATION];
  if (raw) return raw;
  const created = deployment.metadata?.creationTimestamp;
  if (created instanceof Date) return created.toISOString();
  if (typeof created === 'string' && created) return created;
  return new Date(0).toISOString();
}

/** Change only the Deployment's pool label. Pod template stays put, so pods do not roll. */
export async function applyPoolLabel(
  projectId: string,
  pool: 'creating' | 'idle' | null
): Promise<void> {
  const apps = getAppsApi();
  const name = releaseNameFor(projectId);
  const live = await apps.readNamespacedDeployment({ name, namespace: ns() });
  const labels = { ...(live.metadata?.labels ?? {}) };
  if (pool) labels[POOL_LABEL] = pool;
  else delete labels[POOL_LABEL];
  live.metadata = { ...live.metadata, labels };
  await apps.replaceNamespacedDeployment({
    name,
    namespace: ns(),
    body: live,
  });
}

export async function probeAgentHealth(projectId: string): Promise<boolean> {
  try {
    if (!(await isReleaseRunning(projectId))) return false;
    const healthUrl = `${resolveUpstreamBase(projectId, 'agent')}/api/health`;
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function scaleRelease(
  projectId: string,
  replicas: number
): Promise<void> {
  const apps = getAppsApi();
  const name = releaseNameFor(projectId);
  try {
    // Prefer replace over patch: the generated client defaults patch to
    // application/json-patch+json, which rejects a Scale object body.
    await apps.replaceNamespacedDeploymentScale({
      name,
      namespace: ns(),
      body: {
        apiVersion: 'autoscaling/v1',
        kind: 'Scale',
        metadata: { name, namespace: ns() },
        spec: { replicas },
      },
    });
  } catch (error) {
    if (isNotFound(error) && replicas === 0) return;
    throw error;
  }
}

export async function startRelease(projectId: string): Promise<void> {
  await ensureDeployment(projectId, 1);
}

export async function stopRelease(projectId: string): Promise<void> {
  await scaleRelease(projectId, 0);
}

export async function removeRelease(projectId: string): Promise<void> {
  const apps = getAppsApi();
  const core = getCoreApi();
  const name = releaseNameFor(projectId);

  try {
    await apps.deleteNamespacedDeployment({
      name,
      namespace: ns(),
      propagationPolicy: 'Background',
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    await core.deleteNamespacedService({ name, namespace: ns() });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    await core.deleteNamespacedPersistentVolumeClaim({
      name: pvcNameFor(projectId),
      namespace: ns(),
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    await core.deletePersistentVolume({
      name: `pv-${name}`,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function isReleaseRunning(projectId: string): Promise<boolean> {
  const apps = getAppsApi();
  try {
    const dep = await apps.readNamespacedDeployment({
      name: releaseNameFor(projectId),
      namespace: ns(),
    });
    const ready = dep.status?.readyReplicas ?? 0;
    const desired = dep.spec?.replicas ?? 0;
    return desired > 0 && ready > 0;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function waitForAgentHealth(
  projectId: string,
  timeoutMs = 120_000
): Promise<void> {
  const started = Date.now();
  let lastError = 'not started';
  const healthUrl = `${resolveUpstreamBase(projectId, 'agent')}/api/health`;

  while (Date.now() - started < timeoutMs) {
    try {
      const running = await isReleaseRunning(projectId);
      if (!running) {
        lastError = 'deployment not ready';
      } else {
        const response = await fetch(healthUrl, {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) return;
        lastError = `status ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (/ImagePullBackOff|ErrImagePull/i.test(lastError)) {
        throw new Error(
          `Agent image not available in cluster (${config.agentImage}). Run: pnpm k8s:load-agent`
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Agent health check timed out for ${projectId}: ${lastError}. If the image is missing, run pnpm k8s:load-agent`
  );
}
