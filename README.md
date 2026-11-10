# Agent Sandbox

Open-source multi-tenant agent sandbox. Each project runs in its own Docker container with an isolated workspace volume. There is no login and no enterprise configuration.

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
```

Build the agent image (required after Agent chat/tool changes so containers pick them up):

```bash
pnpm build:agent-image
```


Or start with the placeholder image while iterating on pod-server:

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

If port `3000` or `7000` is already taken locally, override them:

```bash
POD_SERVER_PORT=7100 POD_SERVER_PUBLIC_URL=http://localhost:7100 pnpm --filter @agent-sandbox/pod-server dev
POD_SERVER_URL=http://localhost:7100 WEB_PORT=3003 pnpm --filter @agent-sandbox/web dev
```

### Isolation check

With pod-server running:

```bash
POD_SERVER_URL=http://localhost:7100 bash scripts/isolation-check.sh
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for real agent chat |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Model id |
| `POD_SERVER_URL` | `http://localhost:7000` | Web → pod-server |
| `POD_SERVER_PORT` | `7000` | pod-server listen port |
| `WEB_PORT` | `3000` | Web listen port |
| `AGENT_IMAGE` | `agent-sandbox-agent:latest` | Docker image for project sandboxes |
| `AGENT_PORT` | `4000` | Agent API port inside container |
| `PREVIEW_PORT` | `8000` | Preview port inside container |

## UI packages

The Web UI reuses Rush design tokens and chat rendering via local workspace packages (no enterprise auth / OSS / Agent marketplace):

| Package | Role |
|---|---|
| `@cortex/ui` | shadcn/ui primitives + Tailwind v4 theme (`@cortex/ui/styles`) |
| `@cortex/ai-components` | Chat elements + `PartRenderer` / tool cards (`rush-v2-chat`) |
| `@cortex/shared` | Thin type/utils shim for the components above |

Web depends on AI SDK v6 (`ai` / `@ai-sdk/react`) and PostCSS Tailwind (`@tailwindcss/postcss`). After `pnpm install`, start Web as usual — styles come from `@import "@cortex/ui/styles"` in `apps/web/app/globals.css`.

### Storybook (`@cortex/ui`)

```bash
pnpm storybook
# http://localhost:6006
```

Stories live under `packages/ui/src/components/ui/*.stories.tsx`. Chromatic is not included in this open-source repo.


## Isolation guarantees

- One Docker container per project
- One host volume mounted at `/workspace`
- Reverse proxy paths `/p/:projectId/agent` and `/p/:projectId/preview`
- Workspace tools reject paths outside `/workspace`

## License

Apache-2.0

