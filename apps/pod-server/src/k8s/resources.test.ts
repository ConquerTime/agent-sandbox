import { describe, expect, it } from 'vitest';
import {
  pvcNameFor,
  releaseNameFor,
  workspaceHostPath,
} from './resources.js';
import {
  agentDevMountSpec,
  buildDeployment,
  deploymentNeedsReconcile,
  deploymentTemplateHash,
  resolveUpstreamBase,
  serviceDns,
} from './runtime.js';

describe('k8s resource naming', () => {
  it('builds stable release and pvc names', () => {
    expect(releaseNameFor('abc123')).toBe('as-agent-abc123');
    expect(pvcNameFor('abc123')).toBe('as-agent-abc123-workspace');
  });

  it('builds workspace host paths under the configured root', () => {
    expect(workspaceHostPath('abc123', '/var/agent-sandbox/volumes')).toBe(
      '/var/agent-sandbox/volumes/abc123'
    );
  });

  it('builds ClusterIP DNS and upstream URLs from config', () => {
    expect(serviceDns('abc123')).toContain('as-agent-abc123.');
    expect(resolveUpstreamBase('abc123', 'agent')).toMatch(
      /^http:\/\/as-agent-abc123\.[^/]+:\d+$/
    );
    expect(resolveUpstreamBase('abc123', 'preview')).toMatch(
      /^http:\/\/as-agent-abc123\.[^/]+:\d+$/
    );
  });
});

describe('agent dev mount spec', () => {
  it('maps repo source trees to readonly pod mounts and supervisor command', () => {
    const spec = agentDevMountSpec('/Users/me/agent-sandbox/');
    expect(spec.command).toEqual(['node', 'src/dev-supervisor.mjs']);
    expect(spec.volumes).toEqual([
      {
        name: 'agent-src',
        hostPath: {
          path: '/Users/me/agent-sandbox/apps/agent/src',
          type: 'Directory',
        },
      },
      {
        name: 'shared-src',
        hostPath: {
          path: '/Users/me/agent-sandbox/packages/shared',
          type: 'Directory',
        },
      },
    ]);
    expect(spec.volumeMounts).toEqual([
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
    ]);
  });

  it('detects when live deployment diverges from desired command or mounts', () => {
    const base = buildDeployment('abc123');
    const desired = structuredClone(base);
    const container = desired.spec?.template?.spec?.containers?.[0];
    expect(container).toBeDefined();
    if (!container) throw new Error('expected agent container');

    container.command = ['node', 'src/dev-supervisor.mjs'];
    container.volumeMounts = [
      ...(container.volumeMounts ?? []),
      {
        name: 'agent-src',
        mountPath: '/app/apps/agent/src',
        readOnly: true,
      },
    ];
    const podSpec = desired.spec?.template?.spec;
    expect(podSpec).toBeDefined();
    if (!podSpec) throw new Error('expected pod spec');
    podSpec.volumes = [
      ...(podSpec.volumes ?? []),
      {
        name: 'agent-src',
        hostPath: {
          path: '/repo/apps/agent/src',
          type: 'Directory',
        },
      },
    ];

    expect(deploymentNeedsReconcile(structuredClone(desired), desired)).toBe(
      false
    );

    const liveOldCommand = structuredClone(desired);
    const oldContainer = liveOldCommand.spec?.template?.spec?.containers?.[0];
    expect(oldContainer).toBeDefined();
    if (!oldContainer) throw new Error('expected agent container');
    oldContainer.command = undefined;
    expect(deploymentNeedsReconcile(liveOldCommand, desired)).toBe(true);

    const liveMissingMount = structuredClone(desired);
    const thinContainer =
      liveMissingMount.spec?.template?.spec?.containers?.[0];
    expect(thinContainer).toBeDefined();
    if (!thinContainer) throw new Error('expected agent container');
    thinContainer.volumeMounts = [
      { name: 'workspace', mountPath: '/workspace' },
    ];
    expect(deploymentNeedsReconcile(liveMissingMount, desired)).toBe(true);
  });
});

describe('deployment template identity', () => {
  it('hashes image, command, and mounts, ignoring the per-project workspace claim', () => {
    const left = deploymentTemplateHash(buildDeployment('project-a'));
    const right = deploymentTemplateHash(buildDeployment('project-b'));
    expect(left).toBe(right);

    const changed = structuredClone(buildDeployment('project-a'));
    const container = changed.spec?.template?.spec?.containers?.[0];
    expect(container).toBeDefined();
    if (!container) throw new Error('expected agent container');
    container.image = 'agent-sandbox-agent:other';
    expect(deploymentTemplateHash(changed)).not.toBe(left);
  });

  it('puts pool labels on the Deployment only, not the pod template', () => {
    const deployment = buildDeployment('pool123', {
      state: 'creating',
      templateHash: 'abc123hash',
      createdAt: '2026-11-11T00:00:00.000Z',
    });

    expect(deployment.metadata?.labels?.['agent-sandbox.pool']).toBe('creating');
    expect(deployment.metadata?.labels?.['agent-sandbox.template']).toBe(
      'abc123hash'
    );
    expect(deployment.metadata?.annotations?.['agent-sandbox.pool/created-at']).toBe(
      '2026-11-11T00:00:00.000Z'
    );
    expect(
      deployment.spec?.template?.metadata?.labels?.['agent-sandbox.pool']
    ).toBeUndefined();
    expect(deployment.spec?.template?.metadata?.labels?.['agent-sandbox.project']).toBe(
      'pool123'
    );
  });
});
