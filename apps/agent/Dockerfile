FROM node:22.19.0-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/agent/package.json apps/agent/package.json

RUN pnpm install --filter @agent-sandbox/agent...

COPY apps/agent apps/agent

WORKDIR /app/apps/agent
RUN pnpm build

ENV WORKSPACE_DIR=/workspace
ENV AGENT_PORT=4000
ENV PREVIEW_PORT=8000

EXPOSE 4000 8000

CMD ["node", "dist/index.js"]
