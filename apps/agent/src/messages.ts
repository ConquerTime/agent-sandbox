import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { UIMessage } from 'ai';
import { getWorkspaceDir } from './workspace.js';

function messagesPath(): string {
  const dir = join(getWorkspaceDir(), '.sandbox');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'messages.jsonl');
}

export function loadMessages(): UIMessage[] {
  const path = messagesPath();
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const messages: UIMessage[] = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as UIMessage);
    } catch {
      // skip corrupt lines
    }
  }
  return messages;
}

export function appendMessage(message: UIMessage): void {
  appendFileSync(messagesPath(), `${JSON.stringify(message)}\n`, 'utf8');
}

export function replaceMessages(messages: UIMessage[]): void {
  const path = messagesPath();
  const payload = messages.map((message) => JSON.stringify(message)).join('\n');
  writeFileSync(path, payload ? `${payload}\n` : '', 'utf8');
}
