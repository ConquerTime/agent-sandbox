import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveWorkspacePath } from './workspace.js';

test('resolveWorkspacePath rejects escaping paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'as-ws-'));
  process.env.WORKSPACE_DIR = dir;

  const inside = resolveWorkspacePath('src/app.ts');
  assert.ok(inside.includes('src/app.ts'));

  assert.throws(() => resolveWorkspacePath('../outside.txt'));
  assert.throws(() => resolveWorkspacePath('/etc/passwd'));
  assert.throws(() => resolveWorkspacePath('../../outside.txt'));

  rmSync(dir, { recursive: true, force: true });
});
