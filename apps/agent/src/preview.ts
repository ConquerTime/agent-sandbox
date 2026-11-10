import { spawn, type ChildProcess } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { getWorkspaceDir } from './workspace.js';

let previewPort = Number(process.env.PREVIEW_PORT || 8000);
let previewProcess: ChildProcess | null = null;
let currentScript: string | null = null;
let staticServer: Server | null = null;
let reconcileQueued = false;

function ensureDefaultPreviewFiles(workspace: string): void {
  const indexPath = join(workspace, 'index.html');
  if (existsSync(indexPath)) return;

  writeFileSync(
    indexPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent Sandbox Preview</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; color: #111; }
      code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Agent Sandbox</h1>
    <p>This project workspace is empty. Ask the agent to create files, then refresh.</p>
    <p>Workspace: <code>/workspace</code></p>
  </body>
</html>
`,
    'utf8'
  );
}

function contentType(relative: string): string {
  const ext = relative.split('.').pop()?.toLowerCase();
  if (ext === 'html') return 'text/html; charset=utf-8';
  if (ext === 'js' || ext === 'mjs') return 'text/javascript; charset=utf-8';
  if (ext === 'css') return 'text/css; charset=utf-8';
  if (ext === 'json') return 'application/json; charset=utf-8';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/** Exported for unit tests: which npm script should own the preview port. */
export function detectDesiredPreviewScript(workspace: string): string | null {
  const packageJsonPath = join(workspace, 'package.json');
  if (!existsSync(packageJsonPath)) return null;
  if (!existsSync(join(workspace, 'node_modules'))) return null;

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    if (pkg.scripts?.dev) return 'dev';
    if (pkg.scripts?.start) return 'start';
    if (pkg.scripts?.preview) return 'preview';
  } catch {
    return null;
  }
  return null;
}

function stopStaticServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!staticServer) {
      resolve();
      return;
    }
    const server = staticServer;
    staticServer = null;
    server.close(() => resolve());
  });
}

function stopPreviewProcess(): Promise<void> {
  return new Promise((resolve) => {
    if (!previewProcess) {
      currentScript = null;
      resolve();
      return;
    }
    const child = previewProcess;
    previewProcess = null;
    currentScript = null;
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // already exited
      }
      resolve();
    }, 3_000);
  });
}

function startStaticServer(port: number, root: string): void {
  if (staticServer) return;

  staticServer = createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
      let relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
      let filePath = join(root, relative);

      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      if (!existsSync(filePath) && existsSync(join(root, 'index.html'))) {
        filePath = join(root, 'index.html');
        relative = 'index.html';
      }

      if (!existsSync(filePath)) {
        res.writeHead(404).end('Not found');
        return;
      }

      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType(relative) });
      res.end(content);
    } catch (error) {
      res
        .writeHead(500)
        .end(error instanceof Error ? error.message : 'Preview error');
    }
  });

  staticServer.listen(port, '0.0.0.0', () => {
    console.log(`[agent] preview static server on :${port}`);
  });
}

function startNpmPreview(scriptName: string, workspace: string, port: number): void {
  if (previewProcess) return;

  currentScript = scriptName;
  previewProcess = spawn(
    'npm',
    ['run', scriptName, '--', '--host', '0.0.0.0', '--port', String(port)],
    {
      cwd: workspace,
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '0.0.0.0',
      },
      stdio: 'inherit',
    }
  );

  previewProcess.on('exit', (code) => {
    console.warn(`[agent] preview process exited with code ${code}`);
    previewProcess = null;
    currentScript = null;
    startStaticServer(port, workspace);
  });

  console.log(`[agent] preview npm run ${scriptName} on :${port}`);
}

/**
 * Prefer an npm preview script when dependencies exist; otherwise serve static files.
 * Safe to call repeatedly after Write / Edit / Bash.
 */
export async function reconcilePreview(
  port = previewPort
): Promise<{ mode: 'static' | 'npm'; script: string | null }> {
  previewPort = port;
  const workspace = getWorkspaceDir();
  mkdirSync(workspace, { recursive: true });
  ensureDefaultPreviewFiles(workspace);

  const desiredScript = detectDesiredPreviewScript(workspace);

  if (desiredScript) {
    if (previewProcess && currentScript === desiredScript) {
      return { mode: 'npm', script: desiredScript };
    }

    await stopStaticServer();
    if (previewProcess && currentScript !== desiredScript) {
      await stopPreviewProcess();
    }
    if (!previewProcess) {
      startNpmPreview(desiredScript, workspace, port);
    }
    return { mode: 'npm', script: desiredScript };
  }

  await stopPreviewProcess();
  startStaticServer(port, workspace);
  return { mode: 'static', script: null };
}

/**
 * Coalesce bursty tool writes into a single reconcile pass.
 */
export function scheduleReconcilePreview(): void {
  if (reconcileQueued) return;
  reconcileQueued = true;
  queueMicrotask(() => {
    reconcileQueued = false;
    void reconcilePreview().catch((error) => {
      console.warn('[agent] preview reconcile failed:', error);
    });
  });
}

/**
 * Prefer npm scripts if package.json exists; otherwise serve static files.
 */
export function startPreview(
  port = Number(process.env.PREVIEW_PORT || 8000)
): void {
  previewPort = port;
  void reconcilePreview(port).catch((error) => {
    console.warn('[agent] failed to start preview:', error);
    startStaticServer(port, getWorkspaceDir());
  });
}
