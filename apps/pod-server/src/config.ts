import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();

/** Host path to the monorepo root for local agent source mounts; empty disables. */
function resolveAgentDevRoot(): string {
  const raw = (process.env.AGENT_DEV_ROOT || '').trim();
  if (!raw) return '';
  if (process.env.AGENT_DEV === '0' || process.env.AGENT_DEV === 'false') {
    return '';
  }
  return raw.replace(/\/$/, '');
}

export const config = {
  port: Number(process.env.POD_SERVER_PORT || 7000),
  agentImage: process.env.AGENT_IMAGE || 'agent-sandbox-agent:latest',
  agentPort: Number(process.env.AGENT_PORT || 4000),
  previewPort: Number(process.env.PREVIEW_PORT || 8000),
  dataDir: process.env.POD_DATA_DIR || join(cwd, 'data'),
  publicBaseUrl:
    process.env.POD_SERVER_PUBLIC_URL ||
    `http://localhost:${process.env.POD_SERVER_PORT || 7000}`,
  k8sNamespace: process.env.K8S_NAMESPACE || 'agent-sandbox',
  agentEnvSecret: process.env.AGENT_ENV_SECRET || 'agent-env',
  /** Absolute path on the kind node (and pod-server mount) for project workspaces. */
  workspaceHostRoot:
    process.env.WORKSPACE_HOST_ROOT ||
    join(process.env.POD_DATA_DIR || join(cwd, 'data'), 'volumes'),
  /**
   * When set (local OrbStack/kind), agent pods mount apps/agent/src and
   * packages/shared from this repo root and run the polling supervisor.
   */
  agentDevRoot: resolveAgentDevRoot(),
  /** Idle warm pods kept ready for the next create. `0` disables the pool. */
  get poolSize(): number {
    return resolvePoolSize();
  },
};

function resolvePoolSize(): number {
  const raw = process.env.POD_POOL_SIZE;
  if (raw === undefined || raw.trim() === '') return 1;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return 1;
  return value;
}

mkdirSync(join(config.dataDir, 'volumes'), { recursive: true });
mkdirSync(join(config.dataDir, 'registry'), { recursive: true });
