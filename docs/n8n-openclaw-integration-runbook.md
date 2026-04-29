# n8n × OpenClaw Gateway 联调 Runbook

**Date**: 2026-04-25  
**Scope**: `n8n-worker` 内的 `Implementation Agent` 通过 OpenClaw Gateway 调用 `cursor_agent`。  
**Purpose**: 记录一次真实联调过程中的问题、根因、人工干预点和验证方法，供后续教程复用。

> Current note (Phase 6E+): this runbook preserves the pre-6E direct
> n8n/OpenClaw integration history. Current implementation execution state is
> owned by the Local Runner through `agent/jobs/`; OpenClaw Gateway /
> `cursor_agent` is now the default backend adapter behind that runner, not the
> state source.

## 1. Why This Matters

当前 Phase 6E+ 架构里，`n8n` 是编排层，不直接承担复杂代码生成或 backend
状态追踪。实现状态由 Local Runner 的 `agent/jobs/` 工件持有，OpenClaw
Gateway / `cursor_agent` 作为默认 backend adapter。

历史上的直接联调链路是：

`n8n Implementation Agent -> OpenClaw Gateway -> cursor_agent`

因此，OpenClaw Gateway 仍是 Cursor adapter 可用性的关键依赖，但不再是
implementation job state 的来源。

## 2. 关键前提

`Implementation Agent` 依赖以下配置：

- `OPENCLAW_GATEWAY_URL` (default: `http://host.docker.internal:18789`)
- `OPENCLAW_GATEWAY_ORIGIN` (default: `http://host.docker.internal`)
- `OPENCLAW_GATEWAY_TOKEN` (if gateway requires token auth)
- Docker 环境内必须能访问 `host.docker.internal`

在 `n8n-workflows/implementation-agent.n8n.js` 中，网关探测通过 WebSocket RPC 完成，目标地址是：

- `ws://${OPENCLAW_GATEWAY_HOST}/ws` (由 `OPENCLAW_GATEWAY_URL` 推导)

## 3. 问题复盘（现象 -> 根因 -> 处理）

### Case A: `openclaw_not_in_path` / 无法执行 OpenClaw CLI

- **现象**: 在 `n8n-worker` 中直接调用 `openclaw run` 失败。
- **根因**: OpenClaw CLI 跑在宿主机，不在容器 PATH；容器内执行模型与宿主机工具链隔离。
- **处理**: 改为 **Gateway RPC** 架构，不再依赖容器内 `openclaw` 可执行文件。

### Case B: `WebSocket is not available in n8n runtime`

- **现象**: n8n Code node 中没有全局 `WebSocket`。
- **根因**: n8n Code node 运行时受限，缺少浏览器式 API。
- **处理**: 在 workflow 脚本中生成临时 Node 脚本（`/tmp/openclaw-gateway-probe.mjs`），通过 `child_process` 执行 `node` 来发起 WebSocket 连接与 RPC。

### Case C: `CONTROL_UI_ORIGIN_NOT_ALLOWED`

- **现象**: WebSocket 可连通但 `connect` RPC 被拒绝，报 Origin 不允许。
- **根因**: Gateway 侧 `allowedOrigins` 未覆盖 n8n 容器来源。
- **人工干预**:
  - 在 OpenClaw Gateway 配置中加入：
    - `http://host.docker.internal`
    - `http://localhost`
    - `http://localhost:18789`
  - 本地调试阶段可启用 `dangerouslyAllowHostHeaderOriginFallback: true`

### Case D: `CONTROL_UI_DEVICE_IDENTITY_REQUIRED`

- **现象**: Origin 通过后仍拒绝连接，要求设备身份校验。
- **根因**: Gateway 控制面启用了设备认证，但 n8n worker 未具备该身份流。
- **人工干预**:
  - 本地开发阶段可临时设置 `dangerouslyDisableDeviceAuth: true`
  - 同时通过 `OPENCLAW_GATEWAY_TOKEN` 提供 Bearer token

### Case E: Gateway reachable but no automated mapping

- **现象**: `sessions.list` 可通过，但实现任务仍返回 `needs_human`。
- **根因**: 网关连通性已建立，但 `Implementation Agent` 尚未完成“任务内容 -> cursor_agent 调用参数”的自动映射（当前脚本对通用任务仍是占位路径）。
- **处理方向**:
  - 补齐 cursor_agent 调用协议的输入映射（task + plan + test-plan -> tool call）
  - 把返回的结构化结果（变更文件、摘要、失败分类）写入 `build.md`

## 4. 已落地的实现策略

在 `n8n-workflows/implementation-agent.n8n.js` 中已实现：

- 从 `.env` 和进程环境读取 Gateway 配置
- 通过 `/tmp/openclaw-gateway-probe.mjs` 执行 WebSocket RPC 探测
- `connect` + `sessions.list` 健康检查
- 将典型错误分类为：
  - `openclaw_gateway_unreachable`
  - `openclaw_gateway_origin_not_allowed`
  - `openclaw_gateway_device_identity_required`
  - `needs_human`（连通但尚无自动执行映射）

## 5. 联调验证清单（教程可直接复用）

1. 确认 OpenClaw Gateway 在宿主机可用（监听 `18789`）。
2. 在容器内确认 `host.docker.internal` 可达宿主机。
3. 在 `.env` 配置：
   - `OPENCLAW_GATEWAY_URL`
   - `OPENCLAW_GATEWAY_ORIGIN`
   - `OPENCLAW_GATEWAY_TOKEN`
4. 运行 Implementation Agent，一次性检查：
   - 是否生成 `build/{task_id}.build.md`
   - 失败分类是否进入 `openclaw_gateway_*` 之一
5. 做一个只读 smoke case（不要求真实改码）验证链路：
   - `n8n -> gateway -> cursor_agent` 是否可返回结构化响应

## 6. 教程建议：如何讲“人工干预”

建议把人工干预明确分两层：

- **必要干预（一次性环境对齐）**
  - allowed origins
  - token 注入
  - 本地调试时的设备认证策略
- **应逐步消除的干预（工程债）**
  - 手工修改 gateway 配置
  - `needs_human` 占位路径
  - 依赖临时脚本探测而非稳定 SDK 封装

这样教程读者能理解：人工步骤不是“流程失败”，而是本地控制面接入时常见的 bootstrap 阶段工作。

## 7. 安全注意事项

- `dangerouslyDisableDeviceAuth` 和 `dangerouslyAllowHostHeaderOriginFallback` 仅用于本地开发调试。
- 不要把 Gateway 暴露到公网。
- 不要把 token 写入 Git。
- 演示结束后，建议恢复更严格的认证配置。

## 8. Local Runner 心跳与看门狗（Phase 6E+）

从 Phase 6E 起，Implementation 执行状态由 `agent/jobs/` 本地工件驱动，不再依赖
Gateway 侧状态 RPC。建议在联调时明确以下参数：

- `LOCAL_RUNNER_HEARTBEAT_MS`（默认 `15000`）
  - 作用端：`runner/runner.js`
  - 行为：任务 `running` 期间定期刷新 `status.json.updated_at`
- `LOCAL_RUNNER_STALE_RUNNING_SECONDS`（默认 `900`）
  - 作用端：`n8n-workflows/implementation-agent.n8n.js`
  - 行为：若 `running` 状态长时间无 heartbeat 前进，则写入 timeout `result.json` / `status.json`

### 推荐排障顺序

1. 先看 `agent/jobs/{task_id}.status.json` 的 `updated_at` 是否持续前进。
2. 再看 `agent/jobs/{task_id}.logs/adapter.jsonl` 是否有 `job_heartbeat` 事件。
3. 若长时间无前进，确认是否命中 watchdog timeout（`stale_running_watchdog_timeout`）。

### 结果工件一致性

`runner` 会在写入 terminal `result.json` 前统一 `changed_files` 路径格式为
`target-repos/...`，避免出现裸相对路径（如 `src/index.js`）导致聚合报表歧义。
