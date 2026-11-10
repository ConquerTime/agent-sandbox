import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { detectDesiredPreviewScript } from './preview.js';

test('detectDesiredPreviewScript requires package script and node_modules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'as-preview-'));

  assert.equal(detectDesiredPreviewScript(dir), null);

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: { dev: 'vite' } })
  );
  assert.equal(detectDesiredPreviewScript(dir), null);

  mkdirSync(join(dir, 'node_modules'));
  assert.equal(detectDesiredPreviewScript(dir), 'dev');

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: { start: 'node server.js' } })
  );
  assert.equal(detectDesiredPreviewScript(dir), 'start');

  rmSync(dir, { recursive: true, force: true });
});
