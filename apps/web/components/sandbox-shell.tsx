'use client';

import { useChat } from '@ai-sdk/react';
import type { RushUIDataTypes } from '@cortex/shared/types/ai-chat';
import { DefaultChatTransport, type UIMessage, type UITools } from 'ai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChatPanel } from './chat-panel';
import { PreviewPanel } from './preview-panel';
import { ProjectSidebar } from './project-sidebar';
import type { Project } from './types';

type RushMessage = UIMessage<unknown, RushUIDataTypes, UITools>;

export function SandboxShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refreshProjects = useCallback(async () => {
    const response = await fetch('/api/projects');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to load projects');
    setProjects(data.projects || []);
    return data.projects as Project[];
  }, []);

  useEffect(() => {
    refreshProjects().catch((err) =>
      setError(err instanceof Error ? err.message : String(err))
    );
  }, [refreshProjects]);

  const transport = useMemo(() => {
    if (!selectedId) return undefined;
    return new DefaultChatTransport({
      api: '/api/chat',
      body: { projectId: selectedId },
    });
  }, [selectedId]);

  const { messages, sendMessage, status, setMessages } = useChat<RushMessage>({
    id: selectedId || 'none',
    transport,
  });

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [selectedId, setMessages]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/projects/${encodeURIComponent(selectedId)}/messages`)
      .then(async (response) => {
        const data = (await response.json()) as {
          messages?: RushMessage[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }
        return data.messages ?? [];
      })
      .then((loaded) => {
        if (cancelled) return;
        setMessages((current) => {
          const ids = new Set(loaded.map((message) => message.id));
          const pending = current.filter((message) => !ids.has(message.id));
          return [...loaded, ...pending];
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, setMessages]);

  const selected = projects.find((project) => project.id === selectedId) || null;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `sandbox-${Date.now().toString(36)}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Create failed');
      await refreshProjects();
      setSelectedId(data.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${selectedId}/stop`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Stop failed');
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${selectedId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      setSelectedId(null);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!selectedId || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setError(null);
    try {
      await sendMessage({ text });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="app-root">
      <div className="sandbox-shell">
        <ProjectSidebar
          projects={projects}
          selectedId={selectedId}
          busy={busy}
          onSelect={setSelectedId}
          onCreate={() => void handleCreate()}
        />
        <ChatPanel
          project={selected}
          messages={messages}
          status={status}
          input={input}
          busy={busy}
          historyLoading={historyLoading}
          error={error}
          onInputChange={setInput}
          onSend={() => void handleSend()}
          onStopProject={() => void handleStop()}
          onDeleteProject={() => void handleDelete()}
        />
        <PreviewPanel project={selected} />
      </div>
    </div>
  );
}
