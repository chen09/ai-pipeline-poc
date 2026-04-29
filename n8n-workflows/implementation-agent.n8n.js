const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const AGENT_ROOT = "/files/agent";
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const PLAN_DIR = path.join(AGENT_ROOT, "plan");
const TEST_DIR = path.join(AGENT_ROOT, "test");
const BUILD_DIR = path.join(AGENT_ROOT, "build");
const ERROR_DIR = path.join(AGENT_ROOT, "error");
const JOBS_DIR = path.join(AGENT_ROOT, "jobs");
const DEBUG_DIR = path.join(AGENT_ROOT, "debug");
const TASK_DEBUG_DIR = path.join(DEBUG_DIR, "tasks");
const LOCK_TTL_SECONDS = 600;
const CONTAINER_PROJECT_ROOT = "/files";
const HOST_PROJECT_ROOT = readEnvVar("HOST_PROJECT_ROOT") || "/Volumes/WDC2T/Project/ai-pipeline-poc";
const DEFAULT_IMPLEMENTATION_BACKEND = readEnvVar("IMPLEMENTATION_BACKEND") || "cursor";
const OPENCLAW_SESSION_KEY = readEnvVar("OPENCLAW_SESSION_KEY") || "agent:dev:main";
const OPENCLAW_GATEWAY_HTTP = readEnvVar("OPENCLAW_GATEWAY_URL") || "http://host.docker.internal:18789";
const OPENCLAW_GATEWAY_WS = `${OPENCLAW_GATEWAY_HTTP.replace(/^http/i, "ws").replace(/\/$/, "")}/ws`;
const OPENCLAW_GATEWAY_ORIGIN = readEnvVar("OPENCLAW_GATEWAY_ORIGIN") || "http://host.docker.internal";
const DEFAULT_LOCAL_RUNNER_TIMEOUT_SECONDS = Number(readEnvVar("LOCAL_RUNNER_TIMEOUT_SECONDS") || "600");
const LOCAL_RUNNER_STALE_RUNNING_SECONDS = Number(readEnvVar("LOCAL_RUNNER_STALE_RUNNING_SECONDS") || "900");
const OPENCLAW_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
  "operator.approvals",
  "operator.pairing",
];

function nowIso() {
  return new Date().toISOString();
}

function ensureDebugDirs() {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  fs.mkdirSync(TASK_DEBUG_DIR, { recursive: true });
}

function safeData(data) {
  return JSON.parse(JSON.stringify(data || {}, (_key, value) => {
    if (typeof value !== "string") return value;
    if (value.length > 2000) return `${value.slice(0, 2000)}...<truncated ${value.length} chars>`;
    return value;
  }));
}

function logEvent(taskId, event, data = {}) {
  try {
    ensureDebugDirs();
    const record = {
      at: nowIso(),
      host: os.hostname(),
      task_id: taskId || null,
      event,
      ...safeData(data),
    };
    const line = `${JSON.stringify(record)}\n`;
    fs.appendFileSync(path.join(DEBUG_DIR, "implementation-agent.jsonl"), line);
    if (taskId) {
      fs.appendFileSync(path.join(TASK_DEBUG_DIR, `${taskId}.jsonl`), line);
    }
  } catch {
    // Instrumentation must never change task routing behavior.
  }
}

function writeFileAtomicVerified(filePath, content, taskId, eventName) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${os.hostname()}-${Date.now()}`;
  logEvent(taskId, `${eventName}_write_start`, { filePath, tmpPath, bytes: Buffer.byteLength(content) });
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, filePath);
  const written = fs.readFileSync(filePath, "utf8");
  if (written !== content) {
    throw new Error(`Verified write mismatch for ${filePath}`);
  }
  logEvent(taskId, `${eventName}_write_verified`, { filePath, bytes: Buffer.byteLength(written) });
}

function writeJsonArtifact(filePath, payload, taskId, eventName) {
  writeFileAtomicVerified(filePath, `${JSON.stringify(payload, null, 2)}\n`, taskId, eventName);
}

function parseIsoMs(value) {
  if (!value) return NaN;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : NaN;
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) throw new Error("Task is missing YAML frontmatter");
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) throw new Error("Task frontmatter is not closed with ---");

  const raw = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).trimStart();
  const fields = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    fields[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
  }
  return { fields, body };
}

function stringifyFrontmatter(fields, body) {
  const orderedKeys = [
    "task_id",
    "title",
    "created_at",
    "status",
    "current_step",
    "pipeline",
    "pipeline_version",
    "revision",
    "retry_count",
    "max_retry",
    "target_repo",
    "priority",
    "blocked_by",
  ];
  const keys = [
    ...orderedKeys.filter((k) => fields[k] !== undefined),
    ...Object.keys(fields).filter((k) => !orderedKeys.includes(k)),
  ];
  return `---\n${keys.map((k) => `${k}: ${fields[k]}`).join("\n")}\n---\n\n${body.trimStart()}`;
}

function requireField(fields, key) {
  if (!fields[key]) throw new Error(`Missing required frontmatter field: ${key}`);
  return fields[key];
}

function getImplementationBackend(task) {
  const raw = task.fields.implementation_backend || task.fields.backend || DEFAULT_IMPLEMENTATION_BACKEND;
  return String(raw || "cursor").trim().toLowerCase();
}

function shouldForceCursor(task) {
  return String(task.fields.force_cursor || "").trim().toLowerCase() === "true";
}

function getTargetRepoRelativePath(task) {
  const targetRepo = requireField(task.fields, "target_repo");
  const normalized = path.posix.normalize(String(targetRepo).replace(/\\/g, "/"));
  if (normalized.startsWith("../") || normalized.startsWith("/") || !normalized.startsWith("target-repos/")) {
    throw new Error(`Invalid target_repo path: ${targetRepo}`);
  }
  return normalized;
}

function getTargetRepoContainerPath(task) {
  return path.posix.join(CONTAINER_PROJECT_ROOT, getTargetRepoRelativePath(task));
}

function getTargetRepoHostPath(task) {
  return path.join(HOST_PROJECT_ROOT, getTargetRepoRelativePath(task));
}

function getJobPaths(taskId) {
  return {
    requestPath: path.join(JOBS_DIR, `${taskId}.request.json`),
    statusPath: path.join(JOBS_DIR, `${taskId}.status.json`),
    resultPath: path.join(JOBS_DIR, `${taskId}.result.json`),
  };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toHostRelativePath(containerPath) {
  const normalized = String(containerPath).replace(/\\/g, "/");
  if (normalized.startsWith("/files/")) return normalized.slice("/files/".length);
  if (normalized.startsWith("/files")) return normalized.slice("/files".length).replace(/^\/+/, "");
  return normalized.replace(/^\/+/, "");
}

function mapRunnerBackend(task) {
  const backend = getImplementationBackend(task);
  if (backend === "cursor") return "cursor-openclaw";
  if (backend === "hermes") return "hermes";
  if (backend === "codex") return "codex";
  return "";
}

function readEnvVar(name) {
  if (fs.existsSync("/proc/self/environ")) {
    const raw = fs.readFileSync("/proc/self/environ", "utf8");
    for (const entry of raw.split("\0")) {
      const sep = entry.indexOf("=");
      if (sep === -1) continue;
      if (entry.slice(0, sep) === name) return entry.slice(sep + 1);
    }
  }
  if (fs.existsSync("/files/.env")) {
    const raw = fs.readFileSync("/files/.env", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      if (trimmed.slice(0, sep) === name) return trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

function lockTask(fileName) {
  const runningPath = path.join(RUNNING_DIR, fileName);
  const lockPath = `${runningPath}.lock`;
  try {
    fs.writeFileSync(lockPath, `${os.hostname()}|${nowIso()}|${LOCK_TTL_SECONDS}\n`, { flag: "wx" });
    logEvent(null, "lock_acquired", { fileName, runningPath, lockPath });
    return lockPath;
  } catch {
    logEvent(null, "lock_skipped", { fileName, runningPath, lockPath });
    return "";
  }
}

function selectTask() {
  const files = fs.readdirSync(RUNNING_DIR).filter((f) => f.endsWith(".md")).sort();
  for (const fileName of files) {
    const runningPath = path.join(RUNNING_DIR, fileName);
    const lockPath = lockTask(fileName);
    if (!lockPath) continue;

    const markdown = fs.readFileSync(runningPath, "utf8");
    const { fields, body } = parseFrontmatter(markdown);
    const taskId = requireField(fields, "task_id");
    logEvent(taskId, "task_read", {
      fileName,
      runningPath,
      current_step: fields.current_step,
      target_repo: fields.target_repo,
      revision: fields.revision,
      retry_count: fields.retry_count,
      force_cursor: fields.force_cursor,
    });
    const planPath = path.join(PLAN_DIR, `${taskId}.plan.md`);
    const testPlanPath = path.join(TEST_DIR, `${taskId}.test-plan.md`);
    const buildPath = path.join(BUILD_DIR, `${taskId}.build.md`);

    if (fields.current_step !== "coding") {
      logEvent(taskId, "task_skipped_step", { current_step: fields.current_step, expected: "coding" });
      fs.rmSync(lockPath);
      continue;
    }
    if (!fs.existsSync(planPath)) throw new Error(`Missing plan artifact: ${planPath}`);
    if (!fs.existsSync(testPlanPath)) {
      logEvent(taskId, "task_skipped_missing_test_plan", { testPlanPath });
      fs.rmSync(lockPath);
      continue; // TDD gate: test-plan must exist first
    }
    logEvent(taskId, "task_selected", { fileName, planPath, testPlanPath, buildPath });
    return { fileName, runningPath, lockPath, markdown, fields, body, planPath, testPlanPath, buildPath };
  }
  return null;
}

function routeToError(task, reason) {
  const fields = { ...task.fields };
  fields.status = "error";
  fields.current_step = "error";
  fields.blocked_by = "Implementation Agent";

  const errorMd = stringifyFrontmatter(
    fields,
    `${task.body}\n\n## Implementation Agent Error\n\n- Time: ${nowIso()}\n- Reason: ${reason}\n`,
  );
  logEvent(task.fields.task_id, "route_to_error", { reason, errorPath: path.join(ERROR_DIR, task.fileName) });
  writeFileAtomicVerified(path.join(ERROR_DIR, task.fileName), errorMd, task.fields.task_id, "error_task");
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
  logEvent(task.fields.task_id, "route_to_error_cleanup_done", { runningPath: task.runningPath, lockPath: task.lockPath });
}

function updateTask(task, updateFields) {
  Object.assign(task.fields, updateFields);
  const content = stringifyFrontmatter(task.fields, task.body);
  writeFileAtomicVerified(task.runningPath, content, task.fields.task_id, "running_task");
  logEvent(task.fields.task_id, "task_updated", {
    runningPath: task.runningPath,
    updateFields,
    current_step: task.fields.current_step,
    status: task.fields.status,
  });
}

function run(cmd, cwd) {
  try {
    const out = execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: out.toString("utf8").trim() };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString("utf8") : "";
    const stderr = error.stderr ? error.stderr.toString("utf8") : "";
    return { ok: false, output: `${stdout}\n${stderr}`.trim(), code: error.status || 1 };
  }
}

function gatewayRequest(ws, method, params = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => reject(new Error(`Gateway timeout on ${method}`)), timeoutMs);
    const onMessage = (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message?.type !== "res" || message?.id !== id) return;

      ws.removeEventListener("message", onMessage);
      clearTimeout(timer);
      if (message.ok) {
        resolve(message.payload);
        return;
      }

      const errorCode = message?.error?.code || "UNAVAILABLE";
      const errorMsg = message?.error?.message || "Gateway request failed";
      const errorDetails = message?.error?.details ? JSON.stringify(message.error.details) : "";
      reject(new Error(`${method} failed [${errorCode}]: ${errorMsg}${errorDetails ? ` ${errorDetails}` : ""}`));
    };

    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}

async function openClawGatewayProbe() {
  const token = readEnvVar("OPENCLAW_GATEWAY_TOKEN");
  try {
    const tmpScriptPath = "/tmp/openclaw-gateway-probe.mjs";
    const script = `
const token = ${JSON.stringify(token)};
const wsUrl = ${JSON.stringify(OPENCLAW_GATEWAY_WS)};
const origin = ${JSON.stringify(OPENCLAW_GATEWAY_ORIGIN)};
const scopes = ${JSON.stringify(OPENCLAW_SCOPES)};

function request(ws, method, params = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const id = \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
    const timer = setTimeout(() => reject(new Error(\`timeout on \${method}\`)), timeoutMs);
    const onMessage = (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message?.type !== "res" || message?.id !== id) return;
      ws.removeEventListener("message", onMessage);
      clearTimeout(timer);
      if (message.ok) resolve(message.payload);
      else {
        const err = message?.error || {};
        reject(new Error(\`\${method} failed [\${err.code || "UNAVAILABLE"}]: \${err.message || "request failed"} \${err.details ? JSON.stringify(err.details) : ""}\`.trim()));
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}

(async () => {
  const headers = { origin };
  if (token) headers.authorization = \`Bearer \${token}\`;
  const ws = new WebSocket(wsUrl, { headers });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket open timeout")), 5000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("websocket open failed")); });
  });
  const connectPayload = {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: "openclaw-control-ui",
      version: "n8n-implementation-agent",
      platform: "linux",
      mode: "webchat",
      instanceId: "n8n-gateway-probe",
    },
    role: "operator",
    scopes,
    caps: ["tool-events"],
    auth: token ? { token } : {},
    userAgent: "n8n-worker",
    locale: "en-US",
  };
  await request(ws, "connect", connectPayload, 15000);
  const sessions = await request(ws, "sessions.list", {}, 15000);
  const sessionCount = Array.isArray(sessions?.sessions) ? sessions.sessions.length : 0;
  ws.close();
  console.log(JSON.stringify({ ok: true, sessionCount }));
})().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: String(error.message || error) }));
});
`;
    fs.writeFileSync(tmpScriptPath, script, "utf8");
    const probeResult = run(`node ${tmpScriptPath}`, "/tmp");
    if (!probeResult.ok || !probeResult.output) {
      return { ok: false, error: probeResult.output || "failed to run node gateway probe" };
    }
    const payload = JSON.parse(probeResult.output);
    if (payload.ok) {
      return {
        ok: true,
        output: `OpenClaw gateway connected; sessions.list ok (sessions=${payload.sessionCount || 0})`,
      };
    }
    return { ok: false, error: payload.error || "gateway probe failed" };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

function buildCursorAgentPrompt(task) {
  const plan = fs.readFileSync(task.planPath, "utf8");
  const testPlan = fs.readFileSync(task.testPlanPath, "utf8");
  const correlationId = `IMPLEMENTATION_RESULT:${task.fields.task_id}`;
  const backend = getImplementationBackend(task);
  const hostTargetRepo = getTargetRepoHostPath(task);
  return `You are the implementation backend for a local multi-agent POC.

Use the cursor_agent tool to modify code in this project.

Project:
- Correlation id: ${correlationId}
- Backend variant: ${backend}
- Target repo on host: ${hostTargetRepo}
- Target repo in task metadata: ${task.fields.target_repo}
- Task id: ${task.fields.task_id}
- Title: ${task.fields.title}

Hard constraints:
- Modify only files under ${hostTargetRepo}.
- Implement the request using the plan and test plan below.
- If tests are needed, add or update focused tests in the target repo.
- Run the target repo test command if practical: npm test
- Do not read or print secrets from .env or any token file.
- Return a concise final report with changed files, commands run, test result, and blockers.
- The final report must include the exact correlation id line: ${correlationId}
- The final report must include either "Blocker: none" or "Blocker: <reason>".

Task brief:
${task.body}

Plan artifact:
${plan}

Test-plan artifact:
${testPlan}
`;
}

async function openClawCursorAgentImplement(task) {
  const token = readEnvVar("OPENCLAW_GATEWAY_TOKEN");
  const promptPath = `/tmp/openclaw-cursor-prompt-${task.fields.task_id}.txt`;
  const tmpScriptPath = `/tmp/openclaw-cursor-implement-${task.fields.task_id}.mjs`;
  const taskSessionKey = `${OPENCLAW_SESSION_KEY}:${task.fields.task_id}`;
  logEvent(task.fields.task_id, "cursor_prompt_prepare", {
    promptPath,
    tmpScriptPath,
    sessionKey: taskSessionKey,
    wsUrl: OPENCLAW_GATEWAY_WS,
  });
  fs.writeFileSync(promptPath, buildCursorAgentPrompt(task), "utf8");

  const script = `
import fs from "node:fs";

const token = ${JSON.stringify(token)};
const wsUrl = ${JSON.stringify(OPENCLAW_GATEWAY_WS)};
const origin = ${JSON.stringify(OPENCLAW_GATEWAY_ORIGIN)};
const scopes = ${JSON.stringify(OPENCLAW_SCOPES)};
const sessionKey = ${JSON.stringify(taskSessionKey)};
const promptPath = ${JSON.stringify(promptPath)};
const taskId = ${JSON.stringify(task.fields.task_id)};
const revision = ${JSON.stringify(task.fields.revision || "0")};
const retryCount = ${JSON.stringify(task.fields.retry_count || "0")};
const marker = \`IMPLEMENTATION_RESULT:\${taskId}\`;

function completionFromSummary(lastSummary) {
  const markerStart = lastSummary.text.lastIndexOf(marker);
  const taskStart = lastSummary.text.lastIndexOf(taskId);
  const relevantStart = Math.max(markerStart, taskStart);
  const relevantText = relevantStart >= 0 ? lastSummary.text.slice(relevantStart) : lastSummary.text;
  const lowered = relevantText.toLowerCase();
  const completionStart = Math.max(
    lowered.lastIndexOf("cursor agent completed"),
    lowered.lastIndexOf("toolresult"),
  );
  const completionText = completionStart >= 0 ? relevantText.slice(completionStart) : relevantText;
  const completionLowered = completionText.toLowerCase();
  const hasCurrentMarker = lowered.includes(marker.toLowerCase());
  const usedCursorAgent = lowered.includes("cursor_agent") || lowered.includes("cursor agent completed") || hasCurrentMarker;
  const completed = completionLowered.includes("cursor agent completed") ||
    completionLowered.includes("ran successfully:") ||
    completionLowered.includes("implementation report") ||
    hasCurrentMarker;
  const blocked = hasBlocker(completionText);
  return { usedCursorAgent, completed, blocked, completionText };
}

function request(ws, method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
    const timer = setTimeout(() => reject(new Error(\`timeout on \${method}\`)), timeoutMs);
    const onMessage = (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message?.type !== "res" || message?.id !== id) return;
      ws.removeEventListener("message", onMessage);
      clearTimeout(timer);
      if (message.ok) resolve(message.payload);
      else {
        const err = message?.error || {};
        reject(new Error(\`\${method} failed [\${err.code || "UNAVAILABLE"}]: \${err.message || "request failed"} \${err.details ? JSON.stringify(err.details) : ""}\`.trim()));
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}

function flattenContent(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenContent).join("\\n");
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.content === "string") return value.content;
    return Object.values(value).map(flattenContent).join("\\n");
  }
  return String(value);
}

function summarizeHistory(history) {
  const messages = Array.isArray(history?.messages) ? history.messages : [];
  const recent = messages.slice(-12);
  const text = recent.map((message) => [
    message.role || "",
    message.stopReason || "",
    flattenContent(message.content),
  ].filter(Boolean).join("\\n")).join("\\n---\\n");
  return {
    messageCount: messages.length,
    text: text.slice(-8000),
  };
}

function hasBlocker(completionText) {
  const lowered = completionText.toLowerCase();
  if (!lowered.includes("blocker")) return false;
  const noBlockerSignals = [
    "blocker:** none",
    "blocker: none",
    "blocker | **none**",
    "blocker | none",
    "error / blocker:** none",
    "error / blocker: none",
    "blockers: none",
  ];
  return !noBlockerSignals.some((signal) => lowered.includes(signal));
}

async function probeRunStatusMethods(ws, sendResult) {
  const runId = sendResult?.runId || sendResult?.id || "";
  if (!runId) return { supported: false, reason: "missing_run_id" };
  const candidates = [
    ["runs.get", { runId }],
    ["runs.status", { runId }],
    ["run.get", { runId }],
    ["run.status", { runId }],
    ["chat.run.get", { runId }],
    ["chat.run.status", { runId }],
    ["chat.runs.get", { runId }],
    ["chat.runs.status", { runId }],
  ];
  const attempts = [];
  for (const [method, params] of candidates) {
    try {
      const payload = await request(ws, method, params, 5000);
      return { supported: true, method, payload, attempts };
    } catch (error) {
      attempts.push({ method, error: String(error.message || error).slice(0, 300) });
    }
  }
  return { supported: false, reason: "no_candidate_supported", attempts };
}

function classifyPollingState(lastSummary, sendResult, elapsedMs, deadlineMs) {
  const completion = completionFromSummary(lastSummary);
  if (completion.usedCursorAgent && completion.completed) {
    return {
      state: completion.blocked ? "blocked" : "completed",
      classification: completion.blocked ? "cursor_agent_blocked" : "implemented",
      ok: !completion.blocked,
      summary: completion.blocked ? "cursor_agent completed with blocker" : "cursor_agent completed",
      output: completion.completionText.slice(-8000),
      elapsedMs,
    };
  }
  if (Date.now() >= deadlineMs) {
    return {
      state: "timeout",
      classification: "cursor_agent_timeout",
      ok: false,
      summary: "Timed out waiting for cursor_agent completion",
      output: lastSummary.text || "No chat history returned before timeout",
      elapsedMs,
    };
  }
  return {
    state: "running",
    classification: "cursor_agent_running",
    ok: false,
    summary: "Cursor/OpenClaw run accepted and still running",
    output: lastSummary.text || "",
    elapsedMs,
    runId: sendResult?.runId || sendResult?.id || "",
  };
}

(async () => {
  const headers = { origin };
  if (token) headers.authorization = \`Bearer \${token}\`;
  const ws = new WebSocket(wsUrl, { headers });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket open timeout")), 5000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("websocket open failed")); });
  });

  await request(ws, "connect", {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: "openclaw-control-ui",
      version: "n8n-implementation-agent",
      platform: "linux",
      mode: "webchat",
      instanceId: "n8n-cursor-implementation",
    },
    role: "operator",
    scopes,
    caps: ["tool-events"],
    auth: token ? { token } : {},
    userAgent: "n8n-worker",
    locale: "en-US",
  }, 15000);

  const message = fs.readFileSync(promptPath, "utf8");
  const sendResult = await request(ws, "chat.send", {
    sessionKey,
    message,
    deliver: false,
    idempotencyKey: \`implementation-\${taskId}-r\${revision}-retry\${retryCount}\`,
  }, 30000);

  const statusProbe = await probeRunStatusMethods(ws, sendResult);
  const startedAt = Date.now();
  const deadline = startedAt + 240000;
  let lastSummary = { messageCount: 0, text: "" };
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const history = await request(ws, "chat.history", { sessionKey, limit: 40 }, 30000);
    lastSummary = summarizeHistory(history);
    const state = classifyPollingState(lastSummary, sendResult, Date.now() - startedAt, deadline);
    if (state.state === "completed" || state.state === "blocked") {
      ws.close();
      console.log(JSON.stringify({
        ok: state.ok,
        state: state.state,
        classification: state.classification,
        summary: state.summary,
        sendResult,
        statusProbe,
        output: state.output,
        elapsedMs: state.elapsedMs,
      }));
      return;
    }
  }

  const finalHistory = await request(ws, "chat.history", { sessionKey, limit: 60 }, 30000);
  lastSummary = summarizeHistory(finalHistory);
  const finalState = classifyPollingState(lastSummary, sendResult, Date.now() - startedAt, deadline);
  if (finalState.state === "completed" || finalState.state === "blocked") {
    ws.close();
    console.log(JSON.stringify({
      ok: finalState.ok,
      state: finalState.state,
      classification: finalState.classification,
      summary: finalState.summary,
      sendResult,
      statusProbe,
      output: finalState.output,
      elapsedMs: finalState.elapsedMs,
    }));
    return;
  }

  ws.close();
  console.log(JSON.stringify({
    ok: false,
    state: finalState.state,
    classification: finalState.classification,
    summary: finalState.summary,
    sendResult,
    statusProbe,
    output: finalState.output,
    elapsedMs: finalState.elapsedMs,
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    ok: false,
    classification: "cursor_agent_gateway_error",
    summary: "OpenClaw cursor_agent invocation failed",
    output: String(error.message || error),
  }));
});
`;

  fs.writeFileSync(tmpScriptPath, script, "utf8");
  logEvent(task.fields.task_id, "cursor_subprocess_start", { tmpScriptPath });
  const execution = run(`node ${tmpScriptPath}`, "/tmp");
  logEvent(task.fields.task_id, "cursor_subprocess_finished", {
    ok: execution.ok,
    code: execution.code || 0,
    outputPreview: execution.output || "",
  });
  if (!execution.output) {
    return {
      ok: false,
      classification: "cursor_agent_gateway_error",
      exitCode: execution.code || 1,
      summary: "OpenClaw cursor_agent invocation produced no output",
      output: execution.output || "",
    };
  }

  let payload;
  try {
    payload = JSON.parse(execution.output);
  } catch {
    logEvent(task.fields.task_id, "cursor_payload_parse_failed", { outputPreview: execution.output });
    return {
      ok: false,
      classification: "cursor_agent_gateway_error",
      exitCode: execution.code || 1,
      summary: "OpenClaw cursor_agent invocation returned invalid JSON",
      output: execution.output,
    };
  }

  logEvent(task.fields.task_id, "cursor_payload_parsed", payload);
  return {
    ok: Boolean(payload.ok),
    backend: "cursor",
    classification: payload.classification || (payload.ok ? "implemented" : "cursor_agent_failed"),
    exitCode: payload.ok ? 0 : 3,
    summary: payload.summary || "cursor_agent implementation finished",
    output: payload.output || "",
  };
}

function unsupportedBackendResult(backend) {
  return {
    ok: false,
    backend,
    classification: "backend_unsupported",
    exitCode: 3,
    summary: `Implementation backend '${backend}' is not wired yet`,
    output:
      "Supported non-deterministic backends currently wired are cursor, hermes, and codex. Claude execution remains deferred until access and a non-interactive tool path are confirmed.",
  };
}

function submitImplementationJob(task) {
  const taskId = task.fields.task_id;
  const runnerBackend = mapRunnerBackend(task);
  if (!runnerBackend) {
    return {
      ok: false,
      backend: getImplementationBackend(task),
      classification: "backend_unsupported",
      exitCode: 3,
      summary: `Implementation backend '${getImplementationBackend(task)}' is not wired for local runner`,
      output: "Supported backends for local runner submission are cursor, hermes, and codex.",
    };
  }

  const paths = getJobPaths(taskId);
  if (fs.existsSync(paths.requestPath)) {
    logEvent(taskId, "job_request_exists", paths);
    return { ok: true, backend: "local_runner", classification: "job_request_exists", summary: "job request already exists", output: "" };
  }

  const requestedTimeout = Number(task.fields.local_runner_timeout_seconds || DEFAULT_LOCAL_RUNNER_TIMEOUT_SECONDS || 600);
  const timeoutSeconds = Number.isFinite(requestedTimeout) && requestedTimeout > 0 ? Math.floor(requestedTimeout) : 600;
  const requestPayload = {
    task_id: taskId,
    target_repo: getTargetRepoRelativePath(task),
    backend: runnerBackend,
    plan_ref: toHostRelativePath(task.planPath),
    test_plan_ref: toHostRelativePath(task.testPlanPath),
    task_brief: task.body,
    created_at: nowIso(),
    timeout_seconds: timeoutSeconds,
    metadata: {
      title: task.fields.title,
      revision: String(task.fields.revision || "0"),
      retry_count: String(task.fields.retry_count || "0"),
      force_cursor: String(task.fields.force_cursor || ""),
    },
  };
  writeFileAtomicVerified(paths.requestPath, `${JSON.stringify(requestPayload, null, 2)}\n`, taskId, "job_request");
  logEvent(taskId, "job_request_submitted", { ...paths, runnerBackend });
  return { ok: true, backend: "local_runner", classification: "job_submitted", summary: "implementation job submitted", output: "" };
}

function pollImplementationJob(task) {
  const taskId = task.fields.task_id;
  const paths = getJobPaths(taskId);
  const result = readJsonIfExists(paths.resultPath);
  const status = readJsonIfExists(paths.statusPath);

  if (!result) {
    const waitingState = status?.state || "queued";
    if (waitingState === "running") {
      const updatedAtMs = parseIsoMs(status?.updated_at);
      const staleAfterMs = LOCAL_RUNNER_STALE_RUNNING_SECONDS * 1000;
      if (Number.isFinite(updatedAtMs) && staleAfterMs > 0) {
        const ageMs = Date.now() - updatedAtMs;
        if (ageMs > staleAfterMs) {
          const staleSeconds = Math.floor(ageMs / 1000);
          logEvent(taskId, "job_stale_watchdog_timeout", {
            statusPath: paths.statusPath,
            resultPath: paths.resultPath,
            staleSeconds,
            staleThresholdSeconds: LOCAL_RUNNER_STALE_RUNNING_SECONDS,
          });
          const timeoutResult = {
            task_id: taskId,
            state: "timeout",
            backend: status?.backend || mapRunnerBackend(task) || "cursor-openclaw",
            summary: `watchdog timeout: job running without heartbeat for ${staleSeconds}s`,
            changed_files: [],
            exit_code: 124,
            error_message: "stale_running_watchdog_timeout",
            details: {
              status_path: paths.statusPath,
              last_updated_at: status?.updated_at || "",
              stale_threshold_seconds: LOCAL_RUNNER_STALE_RUNNING_SECONDS,
            },
            completed_at: nowIso(),
          };
          if (!fs.existsSync(paths.resultPath)) {
            writeJsonArtifact(paths.resultPath, timeoutResult, taskId, "job_watchdog_result");
          }
          const currentStatus = readJsonIfExists(paths.statusPath) || {};
          const terminalStatus = {
            task_id: taskId,
            backend: currentStatus.backend || status?.backend || mapRunnerBackend(task) || "cursor-openclaw",
            state: "timeout",
            started_at: currentStatus.started_at || status?.started_at || nowIso(),
            updated_at: nowIso(),
            pid: currentStatus.pid || status?.pid || 0,
            message: "watchdog timeout",
          };
          writeJsonArtifact(paths.statusPath, terminalStatus, taskId, "job_watchdog_status");
          return {
            pending: false,
            ok: false,
            backend: "local_runner",
            backendDetail: terminalStatus.backend,
            classification: "implementation_job_timeout",
            exitCode: 124,
            summary: timeoutResult.summary,
            output: `${timeoutResult.error_message}\n${JSON.stringify(timeoutResult.details, null, 2)}`,
            changedFiles: [],
          };
        }
      }
    }
    return {
      pending: true,
      ok: false,
      backend: "local_runner",
      classification: "implementation_job_pending",
      summary: `implementation job is ${waitingState}`,
      output: `status_path=${paths.statusPath}`,
      jobState: waitingState,
    };
  }

  const state = String(result.state || "").toLowerCase();
  if (state === "completed") {
    return {
      pending: false,
      ok: true,
      backend: "local_runner",
      backendDetail: result.backend || "cursor-openclaw",
      classification: "implemented",
      exitCode: Number(result.exit_code || 0),
      summary: result.summary || "local runner completed implementation",
      output: JSON.stringify(result.details || {}, null, 2),
      changedFiles: Array.isArray(result.changed_files) ? result.changed_files : [],
    };
  }

  const classification =
    state === "timeout"
      ? "implementation_job_timeout"
      : state === "cancelled"
        ? "implementation_job_cancelled"
        : "implementation_job_failed";
  return {
    pending: false,
    ok: false,
    backend: "local_runner",
    backendDetail: result.backend || "cursor-openclaw",
    classification,
    exitCode: Number(result.exit_code || 3),
    summary: result.summary || `local runner finished with state=${state || "failed"}`,
    output: `${result.error_message || ""}\n${JSON.stringify(result.details || {}, null, 2)}`.trim(),
    changedFiles: Array.isArray(result.changed_files) ? result.changed_files : [],
  };
}

function ensureHealthRoute(task) {
  const appPath = path.join(getTargetRepoContainerPath(task), "src/index.js");
  let source = fs.readFileSync(appPath, "utf8");
  if (source.includes("app.get(\"/health\"")) return "health route already exists";

  const marker = "module.exports = { app };";
  if (!source.includes(marker)) throw new Error("Cannot locate export marker in src/index.js");
  const route = `app.get("/health", (_req, res) => {\n  res.status(200).json({ status: "ok" });\n});\n\n`;
  source = source.replace(marker, `${route}${marker}`);
  fs.writeFileSync(appPath, source);
  return "added /health route";
}

function fixReadmeHeading(task) {
  const readmePath = path.join(getTargetRepoContainerPath(task), "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      "# API Project\n\nSimple Express API used by the multi-agent pipeline POC.\n",
    );
    return "created README.md with correct heading";
  }

  const text = fs.readFileSync(readmePath, "utf8");
  const updated = text.replace(/^#\s+.*$/m, "# API Project");
  if (updated === text) return "README heading already correct";
  fs.writeFileSync(readmePath, updated);
  return "fixed README heading typo";
}

function ensureApiVersionEndpoint(task) {
  const repoPath = getTargetRepoContainerPath(task);
  const appPath = path.join(repoPath, "src/index.js");
  let source = fs.readFileSync(appPath, "utf8");
  const changes = [];

  if (!source.includes("app.get(\"/version\"")) {
    const marker = "app.get(\"/phase6a/status\"";
    if (!source.includes(marker)) throw new Error("Cannot locate route insertion marker in src/index.js");
    const route = `app.get("/version", (_req, res) => {\n  res.status(200).json({ version: "0.1.0" });\n});\n\n`;
    source = source.replace(marker, `${route}${marker}`);
    fs.writeFileSync(appPath, source);
    changes.push("added /version route");
  }

  const testDir = path.join(repoPath, "tests");
  const testPath = path.join(testDir, "version.test.js");
  fs.mkdirSync(testDir, { recursive: true });
  const testContent = `const request = require("supertest");\nconst { app } = require("../src/index");\n\ndescribe("GET /version", () => {\n  it("returns version JSON", async () => {\n    const response = await request(app).get("/version");\n    expect(response.statusCode).toBe(200);\n    expect(response.body).toEqual({ version: "0.1.0" });\n  });\n});\n`;
  if (!fs.existsSync(testPath) || fs.readFileSync(testPath, "utf8") !== testContent) {
    fs.writeFileSync(testPath, testContent);
    changes.push("added /version test");
  }

  return changes.length ? changes.join("; ") : "api version endpoint already implemented";
}

function ensureBffVersionAdapter(task) {
  const repoPath = getTargetRepoContainerPath(task);
  const srcDir = path.join(repoPath, "src");
  const testDir = path.join(repoPath, "tests");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(repoPath, "package.json"), `{\n  "name": "phase6c-bff",\n  "version": "0.1.0",\n  "private": true,\n  "type": "commonjs",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n`);
  fs.writeFileSync(path.join(srcDir, "index.js"), `function adaptApiVersion(apiPayload) {\n  if (!apiPayload || typeof apiPayload.version !== "string") {\n    throw new Error("api version payload is required");\n  }\n\n  return {\n    source: "api",\n    version: apiPayload.version,\n  };\n}\n\nmodule.exports = { adaptApiVersion };\n`);
  fs.writeFileSync(path.join(testDir, "index.test.js"), `const assert = require("node:assert/strict");\nconst test = require("node:test");\n\nconst { adaptApiVersion } = require("../src/index");\n\ntest("adapts api version payload for clients", () => {\n  assert.deepEqual(adaptApiVersion({ version: "0.1.0" }), {\n    source: "api",\n    version: "0.1.0",\n  });\n});\n\ntest("rejects missing version payload", () => {\n  assert.throws(() => adaptApiVersion({}), /api version payload is required/);\n});\n`);
  return "ensured bff version adapter fixture";
}

function ensureWebVersionLabel(task) {
  const repoPath = getTargetRepoContainerPath(task);
  const srcDir = path.join(repoPath, "src");
  const testDir = path.join(repoPath, "tests");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(repoPath, "package.json"), `{\n  "name": "phase6c-web",\n  "version": "0.1.0",\n  "private": true,\n  "type": "commonjs",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n`);
  fs.writeFileSync(path.join(srcDir, "index.js"), `function renderVersionLabel(versionViewModel) {\n  if (!versionViewModel || typeof versionViewModel.version !== "string") {\n    throw new Error("version view model is required");\n  }\n\n  return \`API version: \${versionViewModel.version}\`;\n}\n\nmodule.exports = { renderVersionLabel };\n`);
  fs.writeFileSync(path.join(testDir, "index.test.js"), `const assert = require("node:assert/strict");\nconst test = require("node:test");\n\nconst { renderVersionLabel } = require("../src/index");\n\ntest("renders a stable api version label", () => {\n  assert.equal(renderVersionLabel({ version: "0.1.0" }), "API version: 0.1.0");\n});\n\ntest("rejects missing version view model", () => {\n  assert.throws(() => renderVersionLabel({}), /version view model is required/);\n});\n`);
  return "ensured web version label fixture";
}

function ensureBatchHealth(task) {
  const repoPath = getTargetRepoContainerPath(task);
  const srcDir = path.join(repoPath, "src");
  const testDir = path.join(repoPath, "tests");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(repoPath, "package.json"), `{\n  "name": "phase6c-batch",\n  "version": "0.1.0",\n  "private": true,\n  "type": "commonjs",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n`);
  fs.writeFileSync(path.join(srcDir, "index.js"), `function getBatchHealth() {\n  return {\n    service: "batch",\n    status: "ok",\n  };\n}\n\nmodule.exports = { getBatchHealth };\n`);
  fs.writeFileSync(path.join(testDir, "index.test.js"), `const assert = require("node:assert/strict");\nconst test = require("node:test");\n\nconst { getBatchHealth } = require("../src/index");\n\ntest("returns batch health payload", () => {\n  assert.deepEqual(getBatchHealth(), {\n    service: "batch",\n    status: "ok",\n  });\n});\n`);
  return "ensured batch health fixture";
}

async function implementTask(task) {
  const title = String(task.fields.title || "").toLowerCase();
  const body = String(task.body || "").toLowerCase();
  const backend = getImplementationBackend(task);
  const forceCursor = shouldForceCursor(task);
  logEvent(task.fields.task_id, "implement_start", {
    title: task.fields.title,
    backend,
    forceCursor,
    targetRepo: task.fields.target_repo,
    targetRepoContainerPath: getTargetRepoContainerPath(task),
    targetRepoHostPath: getTargetRepoHostPath(task),
  });

  if (title.includes("impossible requirement") || title.includes("reverse time") || body.includes("reverse time")) {
    return {
      ok: false,
      backend,
      classification: "impossible_requirement",
      exitCode: 2,
      summary: "Task is intentionally impossible; trigger retry policy",
      output: "Cannot implement requirement: reverse time",
    };
  }

  if (!forceCursor && title.includes("health endpoint")) {
    const summary = ensureHealthRoute(task);
    return { ok: true, backend: "other", backendDetail: "legacy_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!forceCursor && title.includes("readme heading typo")) {
    const summary = fixReadmeHeading(task);
    return { ok: true, backend: "other", backendDetail: "legacy_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!forceCursor && title.includes("api version endpoint")) {
    const summary = ensureApiVersionEndpoint(task);
    return { ok: true, backend: "other", backendDetail: "phase6c_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!forceCursor && title.includes("adapt api version payload")) {
    const summary = ensureBffVersionAdapter(task);
    return { ok: true, backend: "other", backendDetail: "phase6c_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!forceCursor && title.includes("render api version label")) {
    const summary = ensureWebVersionLabel(task);
    return { ok: true, backend: "other", backendDetail: "phase6c_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!forceCursor && title.includes("batch health contract")) {
    const summary = ensureBatchHealth(task);
    return { ok: true, backend: "other", backendDetail: "phase6c_deterministic", classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (!["cursor", "hermes", "codex"].includes(backend)) {
    logEvent(task.fields.task_id, "backend_unsupported", { backend });
    return unsupportedBackendResult(backend);
  }

  const submit = submitImplementationJob(task);
  if (!submit.ok) return submit;
  return pollImplementationJob(task);
}

function collectRepoChangeSummary(task) {
  const short = run("git status --short --untracked-files=no", getTargetRepoContainerPath(task));
  if (!short.ok) return "NO_GIT_STATUS";
  const summary = short.output.trim();
  return summary || "NO_CHANGES";
}

function writeBuildArtifact(task, result, repoChangeSummary) {
  const backend = result.backend || getImplementationBackend(task);
  const backendDetail = result.backendDetail || backend;
  logEvent(task.fields.task_id, "build_artifact_prepare", {
    buildPath: task.buildPath,
    backend,
    backendDetail,
    classification: result.classification,
    exitCode: result.exitCode,
    repoChangeSummary,
  });
  const content = `---
task_id: ${task.fields.task_id}
artifact: build
agent_role: Implementation Agent
pipeline: ${task.fields.pipeline}
pipeline_version: ${task.fields.pipeline_version}
revision: ${task.fields.revision || "0"}
source_step: coding
backend: ${backend}
backend_detail: ${backendDetail}
backend_selector: ${getImplementationBackend(task)}
created_at: ${nowIso()}
---

# Build Result: ${task.fields.title}

- backend: ${backend}
- backend_detail: ${backendDetail}
- backend_selector: ${getImplementationBackend(task)}
- classification: ${result.classification}
- exit_code: ${result.exitCode}
- repo_change_summary: ${repoChangeSummary}
- plan_ref: ${task.planPath}
- test_plan_ref: ${task.testPlanPath}

## Summary

${result.summary}

## Output

\`\`\`
${result.output}
\`\`\`
`;
  writeFileAtomicVerified(task.buildPath, content, task.fields.task_id, "build_artifact");
}

function handleFailure(task, result) {
  const retryCount = Number(task.fields.retry_count || "0") + 1;
  const maxRetry = Number(task.fields.max_retry || "3");
  task.fields.retry_count = String(retryCount);
  task.fields.blocked_by = result.classification;
  logEvent(task.fields.task_id, "handle_failure", {
    classification: result.classification,
    retryCount,
    maxRetry,
    summary: result.summary,
  });

  if (retryCount >= maxRetry) {
    routeToError(task, `${result.classification}: ${result.summary}`);
    return { status: "ERROR_ROUTED", task_id: task.fields.task_id, reason: result.classification };
  }

  updateTask(task, { current_step: "coding", status: "running" });
  fs.rmSync(task.lockPath);
  return { status: "RETRY_SCHEDULED", task_id: task.fields.task_id, reason: result.classification };
}

const task = selectTask();
if (!task) {
  logEvent(null, "no_task");
  return [{ json: { status: "NO_TASK" } }];
}

try {
  logEvent(task.fields.task_id, "main_try_start", { runningPath: task.runningPath, lockPath: task.lockPath });
  const result = await implementTask(task);
  logEvent(task.fields.task_id, "implement_finished", result);

  if (result.pending) {
    updateTask(task, { current_step: "coding", status: "running", blocked_by: result.classification });
    fs.rmSync(task.lockPath);
    logEvent(task.fields.task_id, "main_job_pending", { classification: result.classification, jobState: result.jobState });
    return [{ json: { status: "JOB_PENDING", task_id: task.fields.task_id, reason: result.summary } }];
  }

  const changeSummary = result.ok ? collectRepoChangeSummary(task) : "NO_CHANGES";
  logEvent(task.fields.task_id, "change_summary_collected", { changeSummary });
  writeBuildArtifact(task, result, changeSummary);

  if (!result.ok) {
    logEvent(task.fields.task_id, "main_result_not_ok", { classification: result.classification });
    return [{ json: handleFailure(task, result) }];
  }

  updateTask(task, { current_step: "test_running", status: "running", blocked_by: "" });
  fs.rmSync(task.lockPath);
  logEvent(task.fields.task_id, "main_success_cleanup_done", { buildPath: task.buildPath, runningPath: task.runningPath, lockPath: task.lockPath });
  return [{ json: { status: "BUILD_CREATED", task_id: task.fields.task_id, path: task.buildPath } }];
} catch (error) {
  logEvent(task?.fields?.task_id, "main_catch_error", { error: String(error.message || error), stack: String(error.stack || "") });
  routeToError(task, String(error.message || error));
  return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id, error: String(error.message || error) } }];
}
