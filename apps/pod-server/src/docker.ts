import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execFileAsync = promisify(execFile);

async function docker(
  args: string[],
  options?: { allowFailure?: boolean }
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('docker', args, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
  } catch (error) {
    const err = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message: string;
    };
    if (options?.allowFailure) {
      return {
        stdout: (err.stdout || '').trim(),
        stderr: (err.stderr || err.message || '').trim(),
        code: typeof err.code === 'number' ? err.code : 1,
      };
    }
    throw new Error(
      `docker ${args.join(' ')} failed: ${err.stderr || err.message}`
    );
  }
}

export function containerNameFor(projectId: string): string {
  return `as-agent-${projectId}`;
}

export async function containerExists(name: string): Promise<boolean> {
  const result = await docker(['inspect', '--format', '{{.Id}}', name], {
    allowFailure: true,
  });
  return result.code === 0;
}

export async function isContainerRunning(name: string): Promise<boolean> {
  const result = await docker(
    ['inspect', '--format', '{{.State.Running}}', name],
    { allowFailure: true }
  );
  return result.code === 0 && result.stdout === 'true';
}

export async function createAndStartContainer(options: {
  projectId: string;
  volumePath: string;
}): Promise<string> {
  const name = containerNameFor(options.projectId);
  const exists = await containerExists(name);
  if (exists) {
    const running = await isContainerRunning(name);
    if (!running) {
      await docker(['start', name]);
    }
    return name;
  }

  const envArgs: string[] = [
    '-e',
    `WORKSPACE_DIR=/workspace`,
    '-e',
    `AGENT_PORT=${config.agentPort}`,
    '-e',
    `PREVIEW_PORT=${config.previewPort}`,
    '-e',
    `PROJECT_ID=${options.projectId}`,
  ];

  // Pass through model credentials from the host environment.
  for (const key of [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_MODEL',
    'MODEL_ID',
    'CLAUDE_CODE_USE_BEDROCK',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_DEFAULT_REGION',
  ]) {
    const value = process.env[key];
    if (value) {
      envArgs.push('-e', `${key}=${value}`);
    }
  }

  await docker([
    'run',
    '-d',
    '--name',
    name,
    '--label',
    `agent-sandbox.project=${options.projectId}`,
    '-v',
    `${options.volumePath}:/workspace`,
    '-p',
    // Publish to ephemeral host ports; reverse proxy uses docker inspect.
    `${config.agentPort}`,
    '-p',
    `${config.previewPort}`,
    ...envArgs,
    config.agentImage,
  ]);

  return name;
}

export async function startContainer(name: string): Promise<void> {
  const running = await isContainerRunning(name);
  if (!running) {
    await docker(['start', name]);
  }
}

export async function stopContainer(name: string): Promise<void> {
  const exists = await containerExists(name);
  if (!exists) return;
  const running = await isContainerRunning(name);
  if (running) {
    await docker(['stop', name]);
  }
}

export async function removeContainer(name: string): Promise<void> {
  const exists = await containerExists(name);
  if (!exists) return;
  await docker(['rm', '-f', name]);
}

export async function getPublishedPorts(name: string): Promise<{
  agentHostPort: number;
  previewHostPort: number;
}> {
  const agent = await docker([
    'inspect',
    '--format',
    `{{(index (index .NetworkSettings.Ports "${config.agentPort}/tcp") 0).HostPort}}`,
    name,
  ]);
  const preview = await docker([
    'inspect',
    '--format',
    `{{(index (index .NetworkSettings.Ports "${config.previewPort}/tcp") 0).HostPort}}`,
    name,
  ]);

  const agentHostPort = Number(agent.stdout);
  const previewHostPort = Number(preview.stdout);
  if (!agentHostPort || !previewHostPort) {
    throw new Error(
      `Failed to resolve published ports for ${name}: agent=${agent.stdout} preview=${preview.stdout}`
    );
  }
  return { agentHostPort, previewHostPort };
}

export async function waitForAgentHealth(
  name: string,
  timeoutMs = 30000
): Promise<void> {
  const started = Date.now();
  let lastError = 'not started';

  while (Date.now() - started < timeoutMs) {
    try {
      const { agentHostPort } = await getPublishedPorts(name);
      const response = await fetch(
        `http://127.0.0.1:${agentHostPort}/api/health`,
        { signal: AbortSignal.timeout(2000) }
      );
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Agent health check timed out for ${name}: ${lastError}`);
}
