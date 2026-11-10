import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { UIMessage } from 'ai';
import { loadMessages, replaceMessages } from './messages.js';

test('replaceMessages roundtrips tool-Write and AskUserQuestion parts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'as-msg-'));
  process.env.WORKSPACE_DIR = dir;

  const messages = [
    {
      id: 'user-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Build a dark landing page' }],
    },
    {
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-Write',
          toolCallId: 'call-write-1',
          state: 'output-available',
          input: {
            file_path: 'index.html',
            content: '<html><body>hi</body></html>',
          },
          output: { path: 'index.html', bytes: 28 },
        },
        {
          type: 'tool-AskUserQuestion',
          toolCallId: 'call-ask-1',
          state: 'output-available',
          input: {
            questions: [
              {
                header: 'Theme',
                question: 'Which theme?',
                multiSelect: false,
                options: [
                  { label: 'Dark', description: 'Dark theme' },
                  { label: 'Light', description: 'Light theme' },
                ],
              },
            ],
          },
          output: {
            answers: [
              {
                questionIndex: 0,
                selectedLabels: ['Dark'],
              },
            ],
            summary: 'Dark',
          },
        },
        {
          type: 'text',
          text: 'Using the dark theme.',
        },
      ],
    },
  ] as UIMessage[];

  replaceMessages(messages);
  const loaded = loadMessages();

  assert.equal(loaded.length, 2);
  assert.equal(loaded[0]?.role, 'user');
  assert.equal(loaded[1]?.role, 'assistant');

  const parts = loaded[1]?.parts ?? [];
  const writePart = parts.find((part) => part.type === 'tool-Write') as
    | {
        type: string;
        state?: string;
        output?: { path?: string };
      }
    | undefined;
  const askPart = parts.find((part) => part.type === 'tool-AskUserQuestion') as
    | {
        type: string;
        state?: string;
        output?: { summary?: string };
      }
    | undefined;

  assert.ok(writePart);
  assert.equal(writePart.state, 'output-available');
  assert.equal(writePart.output?.path, 'index.html');

  assert.ok(askPart);
  assert.equal(askPart.state, 'output-available');
  assert.equal(askPart.output?.summary, 'Dark');

  rmSync(dir, { recursive: true, force: true });
});
