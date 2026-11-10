import { execFile } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { tool } from 'ai';
import { z } from 'zod';
import { scheduleReconcilePreview } from './preview.js';
import {
  getWorkspaceDir,
  resolveWorkspacePath,
  toWorkspaceRelative,
} from './workspace.js';

const execFileAsync = promisify(execFile);

function listRecursive(dir: string, pattern?: RegExp, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      listRecursive(full, pattern, acc);
      continue;
    }
    const relative = toWorkspaceRelative(full);
    if (!pattern || pattern.test(relative)) {
      acc.push(relative);
    }
  }
  return acc;
}

export function createWorkspaceTools() {
  const workspace = getWorkspaceDir();

  return {
    Read: tool({
      description: 'Read a file from the project workspace',
      inputSchema: z.object({
        file_path: z
          .string()
          .describe('Relative path inside the workspace'),
      }),
      execute: async ({ file_path }) => {
        const absolute = resolveWorkspacePath(file_path);
        const content = readFileSync(absolute, 'utf8');
        return { path: toWorkspaceRelative(absolute), content };
      },
    }),

    Write: tool({
      description: 'Write a file in the project workspace (creates parents)',
      inputSchema: z.object({
        file_path: z.string(),
        content: z.string(),
      }),
      execute: async ({ file_path, content }) => {
        const absolute = resolveWorkspacePath(file_path);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, content, 'utf8');
        scheduleReconcilePreview();
        return { path: toWorkspaceRelative(absolute), bytes: content.length };
      },
    }),

    Edit: tool({
      description: 'Replace an exact string occurrence in a workspace file',
      inputSchema: z.object({
        file_path: z.string(),
        old_string: z.string(),
        new_string: z.string(),
      }),
      execute: async ({ file_path, old_string, new_string }) => {
        const absolute = resolveWorkspacePath(file_path);
        const previous = readFileSync(absolute, 'utf8');
        if (!previous.includes(old_string)) {
          throw new Error(`old_string not found in ${file_path}`);
        }
        const next = previous.replace(old_string, new_string);
        writeFileSync(absolute, next, 'utf8');
        scheduleReconcilePreview();
        return { path: toWorkspaceRelative(absolute), changed: true };
      },
    }),

    Glob: tool({
      description: 'List files in the workspace, optionally filtered by substring',
      inputSchema: z.object({
        pattern: z
          .string()
          .optional()
          .describe('Optional substring or simple wildcard like *.ts'),
      }),
      execute: async ({ pattern }) => {
        let regex: RegExp | undefined;
        if (pattern) {
          const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          regex = new RegExp(escaped, 'i');
        }
        const files = listRecursive(workspace, regex).slice(0, 500);
        return { files, cwd: workspace };
      },
    }),

    Grep: tool({
      description: 'Search file contents in the workspace with a literal or regex',
      inputSchema: z.object({
        query: z.string(),
        path: z.string().optional(),
      }),
      execute: async ({ query, path }) => {
        const root = path ? resolveWorkspacePath(path) : workspace;
        const files = listRecursive(root);
        const matches: Array<{ path: string; line: number; text: string }> = [];
        const regex = new RegExp(query, 'i');

        for (const file of files) {
          const absolute = resolveWorkspacePath(file);
          let content: string;
          try {
            content = readFileSync(absolute, 'utf8');
          } catch {
            continue;
          }
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const text = lines[i] ?? '';
            if (regex.test(text)) {
              matches.push({ path: file, line: i + 1, text });
              if (matches.length >= 100) {
                return { matches, truncated: true };
              }
            }
          }
        }
        return { matches, truncated: false };
      },
    }),

    Bash: tool({
      description:
        'Run a shell command inside the workspace directory. Network-heavy installs may take time.',
      inputSchema: z.object({
        command: z.string(),
      }),
      execute: async ({ command }) => {
        try {
          const { stdout, stderr } = await execFileAsync(
            '/bin/bash',
            ['-lc', command],
            {
              cwd: workspace,
              maxBuffer: 2 * 1024 * 1024,
              timeout: 120_000,
              env: {
                ...process.env,
                HOME: workspace,
              },
            }
          );
          scheduleReconcilePreview();
          return {
            exitCode: 0,
            stdout: stdout.slice(0, 50_000),
            stderr: stderr.slice(0, 20_000),
          };
        } catch (error) {
          const err = error as {
            code?: number;
            stdout?: string;
            stderr?: string;
            message: string;
          };
          scheduleReconcilePreview();
          return {
            exitCode: typeof err.code === 'number' ? err.code : 1,
            stdout: (err.stdout || '').slice(0, 50_000),
            stderr: (err.stderr || err.message).slice(0, 20_000),
          };
        }
      },
    }),

    Stat: tool({
      description: 'Get basic file metadata in the workspace',
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        const absolute = resolveWorkspacePath(path);
        const stats = statSync(absolute);
        return {
          path: toWorkspaceRelative(absolute),
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mtime: stats.mtime.toISOString(),
        };
      },
    }),

    // Client-side tool: no execute. The chat UI answers via addToolOutput.
    AskUserQuestion: tool({
      description:
        'Ask the user a multiple-choice question when a product or design decision is required before continuing. Use sparingly.',
      inputSchema: z.object({
        questions: z
          .array(
            z.object({
              header: z.string().describe('Short label shown above the question'),
              question: z.string(),
              options: z
                .array(
                  z.object({
                    label: z.string(),
                    description: z.string(),
                  })
                )
                .min(2),
              multiSelect: z.boolean(),
            })
          )
          .min(1),
      }),
    }),
  };
}
