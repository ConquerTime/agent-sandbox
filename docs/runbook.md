# Runbook

本机开发、验证与常见故障。系统设计见 [architecture.md](./architecture.md)。

## 前置条件

- Node.js `>= 22.19.0`（见 `.nvmrc`）
- pnpm `>= 10.17.0`
- Docker daemon 已启动，本机能执行 `docker` 命令

## 首次安装

```bash
pnpm install
cp .env.example .env
# 编辑 .env，至少填写 ANTHROPIC_API_KEY
pnpm build:agent-image
```

Agent 镜像标签默认是 `agent-sandbox-agent:latest`。对话要能跑通，必须先有这张镜像。

火山等 Anthropic 兼容网关可在 `.env` 里设 `ANTHROPIC_BASE_URL`、`MODEL_ID` / `ANTHROPIC_MODEL`。Agent 会对非官方域名自动补 `/v1` 并用 Bearer 鉴权。

## 日常启动

加载环境变量后，起两个进程（Web 与 pod-server）。容器内的 Agent 由 pod-server 按项目拉起，一般不需要在宿主机单独跑 Agent。

```bash
set -a && source .env && set +a

# 终端 1
pnpm --filter @agent-sandbox/pod-server dev

# 终端 2
pnpm --filter @agent-sandbox/web dev
```

或：

```bash
set -a && source .env && set +a
pnpm dev
```

打开 http://localhost:3000 。创建项目、对话、看预览。

### 端口冲突

`3000` / `7000` 被占用时，相关变量一起改：

```bash
POD_SERVER_PORT=7100 POD_SERVER_PUBLIC_URL=http://localhost:7100 pnpm --filter @agent-sandbox/pod-server dev
POD_SERVER_URL=http://localhost:7100 WEB_PORT=3003 pnpm --filter @agent-sandbox/web dev
```

## Agent 镜像

### 何时重建

改了 `apps/agent` 的对话、工具、预览、**内核（sdk / claude-code）** 逻辑后，执行：

```bash
pnpm build:agent-image
```

镜像内含 Claude Code CLI（claude-code 内核依赖）。已有项目的容器是旧镜像启动的。`ready` 只会 `docker start`，**不会**换成新镜像。要用新逻辑可以：

- 新建一个项目，或
- 删除该项目（会删容器和卷），再创建，或
- 手动 `docker rm -f as-agent-<id>` 后，再对该项目调用 `ready`（卷若还在，文件会保留；注册表状态需与手动操作一致，不确定时优先走 Web 的 delete / create）

### 占位镜像

只验证 pod-server 生命周期、不接真对话时：

```bash
pnpm build:placeholder
AGENT_IMAGE=agent-sandbox-placeholder:latest pnpm --filter @agent-sandbox/pod-server dev
```

## 检查

```bash
pnpm typecheck
pnpm test
```

隔离（pod-server 已在跑）：

```bash
# 若 pod-server 不在默认 7000，带上同一 URL
POD_SERVER_URL=http://localhost:7100 pnpm isolation-check
```

脚本会建两个项目、确认反代打到不同容器、`stop` 留卷、`delete` 只删目标卷。

Storybook（`@cortex/ui`）：

```bash
pnpm storybook
# http://localhost:6006
```

## 数据放在哪

默认数据根：`apps/pod-server/data`（可用 `POD_DATA_DIR` 覆盖）。

| 路径 | 内容 |
|---|---|
| `registry/projects.json` | 项目元数据与状态 |
| `volumes/<projectId>/` | 工作区文件；挂到容器 `/workspace` |
| `volumes/<projectId>/.sandbox/messages.jsonl` | 完整聊天历史（含 tool parts） |
| `volumes/<projectId>/.sandbox/settings.json` | 项目内核与 `claudeSessionId` |

容器名：`as-agent-<projectId>`。

| 操作 | 结果 |
|---|---|
| Stop | 容器停，卷与消息保留 |
| Ready（已停） | 再起同一容器，同一卷 |
| Delete | 删该项目的容器和卷；其它项目不动 |

## 常见故障

| 现象 | 排查 |
|---|---|
| 创建项目失败 / Docker 报错 | 确认 Docker Desktop / daemon 在跑；本机 `docker ps` 可用 |
| 对话 500，提示缺 Key | `.env` 有 `ANTHROPIC_API_KEY`，且启动 pod-server 前已 `source .env`（Key 要进容器环境） |
| `pnpm build:agent-image` 拉 `node:22.19.0` 失败 | 网络或镜像源问题；换可达的 Docker registry / 代理后再 build |
| ready / 健康检查超时 | `docker logs as-agent-<id>`；确认镜像已 build、端口未被宿主机策略挡住 |
| 对话行为仍是旧工具、没有 AskUserQuestion / 内核切换 | Agent 镜像未重建，或旧容器未换掉；见上文「何时重建」 |
| 切内核返回 409 | 当前回合仍在 streaming / Agent 侧 chat busy；等回合结束后再切 |
| claude-code 显示不可用或对话 400 | 容器内缺 `ANTHROPIC_API_KEY`（启动 pod-server 前需 `source .env`）；或镜像过旧未装 Claude Code CLI |
| 提问卡住、点选项无继续 | 确认当前内核：`sdk` 走 `addToolOutput`，`claude-code` 必须 `POST .../answer`；混用或旧镜像会导致等待超时 |
| 预览一直停在默认静态页 | 工作区还没有 `node_modules`，或 `package.json` 没有 `dev` / `start` / `preview`；装好依赖并写出脚本后，再让 Agent 改一次文件或等下一回合结束重载 |
| Web 连不上 pod-server | `POD_SERVER_URL` 与 pod-server 实际监听端口一致；改了 `POD_SERVER_PORT` 时同步改 `POD_SERVER_PUBLIC_URL` |
| 注册表写着 `running`，容器却不存在 | 曾手动删过容器；对该项目 Delete 后重建，或修 `projects.json` 后再 Ready |
| 端口已被占用 | 换 `WEB_PORT` / `POD_SERVER_PORT`，并同步 `POD_SERVER_URL` / `POD_SERVER_PUBLIC_URL` |

## 环境变量速查

| 变量 | 默认 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | 对话必需；创建容器时注入 |
| `ANTHROPIC_BASE_URL` | — | 可选兼容网关根地址 |
| `ANTHROPIC_MODEL` / `MODEL_ID` | `claude-sonnet-4-5` | 模型 id |
| `AGENT_KERNEL` | `sdk` | 尚无 `.sandbox/settings.json` 时的初始内核（`sdk` \| `claude-code`）；已有项目以磁盘为准，可在 Web 空闲时切换 |
| `POD_SERVER_URL` | `http://localhost:7000` | Web → pod-server |
| `POD_SERVER_PUBLIC_URL` | 同 listen | 对外拼 `agentUrl` / `previewUrl` |
| `POD_SERVER_PORT` | `7000` | pod-server 监听 |
| `WEB_PORT` | `3000` | Web 监听 |
| `AGENT_IMAGE` | `agent-sandbox-agent:latest` | 项目容器镜像 |
| `AGENT_PORT` / `PREVIEW_PORT` | `4000` / `8000` | 容器内端口 |
| `POD_DATA_DIR` | `apps/pod-server/data` | 注册表与卷根目录 |
