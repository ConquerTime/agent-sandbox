import { spawn, type ChildProcess } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { getWorkspaceDir } from './workspace.js';

let previewProcess: ChildProcess | null = null;
let staticServer: ReturnType<typeof createServer> | null = null;

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

/**
 * Prefer npm scripts if package.json exists; otherwise serve static files.
 */
export function startPreview(
  port = Number(process.env.PREVIEW_PORT || 8000)
): void {
  const workspace = getWorkspaceDir();
  mkdirSync(workspace, { recursive: true });
  ensureDefaultPreviewFiles(workspace);

  const packageJson = join(workspace, 'package.json');
  if (existsSync(packageJson) && !previewProcess) {
    try {
      const pkg = JSON.parse(readFileSync(packageJson, 'utf8')) as {
        scripts?: Record<string, string>;
      };
      const scriptName = pkg.scripts?.dev
        ? 'dev'
        : pkg.scripts?.start
          ? 'start'
          : pkg.scripts?.preview
            ? 'preview'
            : null;

      if (scriptName) {
        previewProcess = spawn('npm', ['run', scriptName], {
          cwd: workspace,
          env: {
            ...process.env,
            PORT: String(port),
            HOST: '0.0.0.0',
          },
          stdio: 'inherit',
        });
        previewProcess.on('exit', (code) => {
          console.warn(`[agent] preview process exited with code ${code}`);
          previewProcess = null;
          startStaticServer(port, workspace);
        });
        return;
      }
    } catch (error) {
      console.warn('[agent] failed to start package preview, using static', error);
    }
  }

  startStaticServer(port, workspace);
}
