# 第一期：开源沙盒与 UI

对应提交 `6e5908b`（`Initial open-source agent sandbox with Rush UI packages.`）。

当前行为细节见 [architecture.md](../architecture.md)；本机操作见 [runbook.md](../runbook.md)。本文只记迁了什么、故意没迁什么。

## 目标

从零建一个可公开的仓库：按项目 Docker 隔离、对话、工作区预览。没有登录，没有企业配置中心。视觉与聊天渲染接近 Rush V2，但不搬企业 ChatView。

## 结果

### 三进程沙盒

| 部分 | 落地 |
|---|---|
| 仓库 | 新仓 `git init`，Apache-2.0；不带旧 monorepo 历史 |
| pod-server | 本地 JSON 注册表 + Docker 创建 / ready / stop / delete；反代 `/p/:id/agent` 与 `/p/:id/preview` |
| Agent | 容器内对话 API；工作目录锁定 `/workspace`；消息写卷内 jsonl；预览端口 |
| Web | 项目列表、对话、预览 iframe；请求只转发到 pod-server |

不调用原来的外部 Pod API（`rush.zhenguanyu.com/pod/api` 一类）。旧 `pod-provider` 只作接口参考：响应里的 GitLab、namespace、ingress 都不实现。

对话只保留工作区工具循环（Claude / Anthropic 兼容端点），从企业版 Claude Code provider 抽薄实现，不整棵复制 `prepare-agent-context` / `ai-stream-v2`。

### UI 包

| 包 | 策略 |
|---|---|
| `@cortex/ui` | 整包迁入 `packages/ui`；带 Storybook；不含 Chromatic |
| `@cortex/ai-components` | 精选 `ai-elements` + `rush-v2-chat`（`PartRenderer` / 工具卡） |
| `@cortex/shared` | 新建薄 shim，只满足上述组件的类型与工具 import |

配套改动：

- workspace 扩到 `packages/*`
- Web 升到 AI SDK v6 + Tailwind 4，`transpilePackages` 接上三个包
- Web 壳重写为三栏 `SandboxShell`（侧栏 / Conversation+PartRenderer / 预览）
- Agent 工具名与流式 tool parts 对齐，方便工具卡渲染

## 明确没迁

- 登录 / CAS / `SESS_V2`、用户与项目库
- FDC / Nacos 配置中心
- GitLab、阿里云 OSS
- K8s / 公司 Pod 平台
- 权限平台、Octopus 观测
- 记忆库、Skills 市场、MCP 业务链路
- Lexical 富文本输入、Mention、Suggestion 切 Agent
- 企业版完整 `ChatView`（鉴权、OSS Drawer、Agent 市场）
- `switch-agent`

## 关键路径

- [apps/pod-server](../../apps/pod-server)
- [apps/agent](../../apps/agent)
- [apps/web/components/sandbox-shell.tsx](../../apps/web/components/sandbox-shell.tsx)
- [packages/ui](../../packages/ui)
- [packages/ai-components](../../packages/ai-components)
- [packages/shared](../../packages/shared)

## 验收（当时）

- 两个项目文件互不可见；`stop` 留卷；`delete` 只删目标卷 → 现在用 [runbook 的 isolation-check](../runbook.md#检查)
- UI token / 工具卡能渲染；`pnpm storybook` 可开 `@cortex/ui`
- 改 Agent 后需 `pnpm build:agent-image`，旧容器不会自动换镜像
