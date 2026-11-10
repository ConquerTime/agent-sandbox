'use client';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  Message,
  MessageContent,
} from '@cortex/ai-components/ai-elements';
import { PartRenderer } from '@cortex/ai-components/rush-v2-chat';
import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import { Button } from '@cortex/ui/components/ui/button';
import type { ChatStatus, UIMessage, UITools } from 'ai';
import { SandboxPrompt } from './sandbox-prompt';
import type { Project } from './types';

type RushMessage = UIMessage<unknown, RushUIDataTypes, UITools>;

interface ChatPanelProps {
  project: Project | null;
  messages: RushMessage[];
  status: ChatStatus;
  input: string;
  busy: boolean;
  historyLoading: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStopProject: () => void;
  onDeleteProject: () => void;
}

export function ChatPanel({
  project,
  messages,
  status,
  input,
  busy,
  historyLoading,
  error,
  onInputChange,
  onSend,
  onStopProject,
  onDeleteProject,
}: ChatPanelProps) {
  return (
    <section className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {project ? project.name : 'Chat'}
          </h2>
          <div className="truncate text-xs text-muted-foreground">
            {project
              ? 'Ask the agent to read, edit, and run commands in this workspace'
              : 'Select or create a project'}
          </div>
        </div>
        {project ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onStopProject}
            >
              Stop
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={onDeleteProject}
            >
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          {!project ? (
            <ConversationEmptyState
              title="No project selected"
              description="Create one to start chatting with an isolated agent."
            />
          ) : historyLoading && messages.length === 0 ? (
            <ConversationEmptyState
              title="Loading messages…"
              description="Fetching conversation history from the project volume."
            />
          ) : messages.length === 0 ? (
            <ConversationEmptyState
              title="Start building"
              description='Try: “Create a simple landing page in index.html and make the preview look polished.”'
            />
          ) : (
            messages.map((message, messageIndex) => {
              const isLastMessage = messageIndex === messages.length - 1;
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent from={message.role}>
                    {(message.parts ?? []).map((part, index) => (
                      <PartRenderer
                        key={`${message.id}-${index}`}
                        part={part}
                        message={message}
                        index={index}
                        status={status}
                        isLastMessage={isLastMessage}
                      />
                    ))}
                  </MessageContent>
                </Message>
              );
            })
          )}
        </ConversationContent>
      </Conversation>

      <div className="mx-auto w-full max-w-3xl">
        <SandboxPrompt
          value={input}
          status={status}
          disabled={!project || busy}
          onChange={onInputChange}
          onSend={onSend}
        />
      </div>
    </section>
  );
}
