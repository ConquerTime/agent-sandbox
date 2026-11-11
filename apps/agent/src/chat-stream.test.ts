import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resumeAfterMiss, streamIsFresh } from './chat-stream.js';

describe('stream resume decisions', () => {
  it('treats a stream younger than 15 minutes as fresh', () => {
    const started = new Date(Date.now() - 14 * 60 * 1000).toISOString();
    assert.equal(streamIsFresh(started), true);
  });

  it('treats a stream older than 15 minutes as stale', () => {
    const started = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    assert.equal(streamIsFresh(started), false);
  });

  it('clears a missing or finished redis stream and retries while it still exists', () => {
    assert.equal(resumeAfterMiss(null), 'clear');
    assert.equal(resumeAfterMiss('DONE'), 'clear');
    assert.equal(resumeAfterMiss(true), 'retry');
  });
});
