import { createAnthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { replaceMessages } from './messages.js';
import { createWorkspaceTools } from './tools.js';
import { getWorkspaceDir } from './workspace.js';

const SYSTEM_PROMPT = `You are an open-source coding agent running inside an isolated project sandbox.
Your workspace directory is ${getWorkspaceDir()}.
Use the provided tools to inspect and modify files only inside that workspace.
Prefer small, focused edits. When creating a web app for preview, keep a simple static or Vite setup on the workspace preview port if asked.
Do not attempt to access paths outside the workspace.
When writing or editing files, call the Write / Edit / Read / Bash / Glob / Grep tools by those exact names.
Use AskUserQuestion only when a real product or design choice is required before you can continue. Ask a single clear question with concrete options.
Do not emit switch-agent actions or try to change agents. There is only one agent in this sandbox.`;

function normalizeAnthropicBaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.replace(/\/+$/, '');
  // @ai-sdk/anthropic appends `/messages`; Volcengine coding API needs `/v1/messages`.
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function getModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }
  const baseURL = normalizeAnthropicBaseUrl(process.env.ANTHROPIC_BASE_URL);
  const isCompatibleGateway = Boolean(
    baseURL && !baseURL.includes('api.anthropic.com')
  );
  const anthropic = createAnthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    ...(isCompatibleGateway
      ? {
          // Ark / DeepSeek Anthropic-compatible gateways expect Bearer auth.
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      : {}),
  });
  const modelId =
    process.env.MODEL_ID ||
    process.env.ANTHROPIC_MODEL ||
    'claude-sonnet-4-5';
  return anthropic(modelId);
}

export async function handleChat(body: {
  messages?: UIMessage[];
  message?: UIMessage;
}): Promise<Response> {
  const incoming = body.messages ?? (body.message ? [body.message] : null);
  if (!incoming || incoming.length === 0) {
    return Response.json({ error: 'messages are required' }, { status: 400 });
  }

  // Client transcript is authoritative so tool outputs (AskUserQuestion answers)
  // replace prior pending tool calls with the same message ids.
  replaceMessages(incoming);

  const tools = createWorkspaceTools();
  const model = getModel();

  const stream = createUIMessageStream({
    originalMessages: incoming,
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(incoming, { tools }),
        tools,
        stopWhen: stepCountIs(20),
      });

      // UIMessage stream emits tool-* parts that PartRenderer / tool-registry consume.
      writer.merge(
        result.toUIMessageStream({
          originalMessages: incoming,
        })
      );
    },
    onFinish: ({ messages }) => {
      // Persist full transcript including tool call / result parts for history reload.
      replaceMessages(messages);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
