import { mkdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

export function getWorkspaceDir(): string {
  const dir = process.env.WORKSPACE_DIR || join(process.cwd(), 'workspace');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.sandbox'), { recursive: true });
  return realpathSync(dir);
}

/**
 * Resolve a user-supplied path so it always stays inside the workspace.
 * Absolute paths outside the workspace are rejected.
 */
export function resolveWorkspacePath(inputPath: string): string {
  const workspace = getWorkspaceDir();
  const candidate = isAbsolute(inputPath)
    ? normalize(inputPath)
    : resolve(workspace, inputPath);

  const relativePath = relative(workspace, candidate);
  if (
    relativePath === '' ||
    relativePath === '.'
  ) {
    return workspace;
  }

  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.startsWith('../') ||
    relativePath.startsWith('..\\') ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }

  return candidate;
}

export function toWorkspaceRelative(absolutePath: string): string {
  const workspace = getWorkspaceDir();
  const relativePath = relative(workspace, absolutePath);
  return relativePath || '.';
}
