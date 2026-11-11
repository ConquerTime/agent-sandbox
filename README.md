# Agent Sandbox

Open-source multi-tenant agent sandbox. Each project runs in its own Docker container with an isolated workspace volume. There is no login and no enterprise configuration.

## Documentation

- [Architecture](docs/architecture.md) — processes, request paths, isolation, chat and preview loop
- [Runbook](docs/runbook.md) — setup, image rebuild, checks, troubleshooting
- [Phase 1 migration](docs/migrations/phase-1-sandbox-and-ui.md) — sandbox + UI packages
- [Phase 2 migration](docs/migrations/phase-2-coding-loop.md) — AskUserQuestion, live preview, history
- [Phase 3 migration](docs/migrations/phase-3-kernel-switch.md) — `sdk` / `claude-code` kernel switch
- [Database and stream resume](docs/database-and-resume.md) — optional Postgres control plane and Redis SSE resume

## Architecture

```text
Browser → Web (:3000)
            │
            ├─ project CRUD / ready / stop / delete
            └─ chat + preview proxy
                │
                ▼
           pod-server (:7000)
                │  one container per project
                ▼
             agent
          /workspace volume
          chat API + preview
```

## Requirements

- Node.js >= 22.19.0
- pnpm >= 10.17.0
- Docker

## Setup

```bash
pnpm install
cp .env.example .env
# set ANTHROPIC_API_KEY in .env
pnpm build:agent-image
```

Placeholder image for pod-server-only iteration:

```bash
pnpm build:placeholder
AGENT_IMAGE=agent-sandbox-placeholder:latest pnpm dev:pod
```

## Run

```bash
set -a && source .env && set +a

# terminal 1 — project lifecycle + reverse proxy
pnpm --filter @agent-sandbox/pod-server dev

# terminal 2 — browser UI
pnpm --filter @agent-sandbox/web dev
```

Open http://localhost:3000

Create a project, chat with the agent, and open the preview pane. Stopping a project keeps the volume. Deleting a project removes the container and volume.

If port `3000` or `7000` is already taken:

```bash
POD_SERVER_PORT=7100 POD_SERVER_PUBLIC_URL=http://localhost:7100 pnpm --filter @agent-sandbox/pod-server dev
POD_SERVER_URL=http://localhost:7100 WEB_PORT=3003 pnpm --filter @agent-sandbox/web dev
```

More detail (image rebuild, isolation check, data paths, failures): [docs/runbook.md](docs/runbook.md).

## Coding loop

The agent can pause with `AskUserQuestion` (answered in the UI), then keep editing the workspace. Preview reconciles from static files to an npm `dev`/`start`/`preview` server when dependencies exist. Full transcripts, including tool cards, live in the project volume under `.sandbox/messages.jsonl`.

Each project picks a conversation kernel (`sdk` or `claude-code`) stored in `.sandbox/settings.json`. Switch from the chat header while idle. See [architecture](docs/architecture.md).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for real agent chat |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Model id |
| `AGENT_KERNEL` | `sdk` | Initial kernel for new workspaces (`sdk` or `claude-code`) |
| `POD_SERVER_URL` | `http://localhost:7000` | Web → pod-server |
| `POD_SERVER_PORT` | `7000` | pod-server listen port |
| `WEB_PORT` | `3000` | Web listen port |
| `AGENT_IMAGE` | `agent-sandbox-agent:latest` | Docker image for project sandboxes |
| `AGENT_PORT` | `4000` | Agent API port inside container |
| `PREVIEW_PORT` | `8000` | Preview port inside container |

## UI packages

| Package | Role |
|---|---|
| `@cortex/ui` | shadcn/ui primitives + Tailwind v4 theme (`@cortex/ui/styles`) |
| `@cortex/ai-components` | Chat elements + `PartRenderer` / tool cards (`rush-v2-chat`) |
| `@cortex/shared` | Thin type/utils shim for the components above |

```bash
pnpm storybook
# http://localhost:6006
```

## Isolation guarantees

- One Docker container per project
- One host volume mounted at `/workspace`
- Reverse proxy paths `/p/:projectId/agent` and `/p/:projectId/preview`
- Workspace tools reject paths outside `/workspace`

## License

Apache-2.0
