"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function normalizeGatewayHostForLocalRunner(rawValue) {
  if (!rawValue) return rawValue;
  if (process.platform !== "darwin") return rawValue;
  return rawValue.replace(/host\.docker\.internal/g, "127.0.0.1");
}

function getWebSocketCtor() {
  if (typeof WebSocket !== "undefined") return WebSocket;
  try {
    return require("ws");
  } catch {
    throw new Error("WebSocket runtime is unavailable (global WebSocket or npm package 'ws' is required)");
  }
}

function readEnvVar(projectRoot, name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return "";
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    if (trimmed.slice(0, sep) === name) {
      return trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

function flattenContent(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenContent).join("\n");
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.content === "string") return value.content;
    return Object.values(value).map(flattenContent).join("\n");
  }
  return String(value);
}

function summarizeHistory(history) {
  const messages = Array.isArray(history?.messages) ? history.messages : [];
  const recent = messages.slice(-12);
  const text = recent
    .map((message) =>
      [message.role || "", message.stopReason || "", flattenContent(message.content)]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n---\n");
  return {
    messageCount: messages.length,
    text: text.slice(-10000),
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

function completionFromSummary(summaryText, marker, taskId) {
  const markerStart = summaryText.lastIndexOf(marker);
  const taskStart = summaryText.lastIndexOf(taskId);
  const relevantStart = Math.max(markerStart, taskStart);
  const relevantText = relevantStart >= 0 ? summaryText.slice(relevantStart) : summaryText;
  const lowered = relevantText.toLowerCase();
  const completionStart = Math.max(
    lowered.lastIndexOf("cursor agent completed"),
    lowered.lastIndexOf("toolresult"),
  );
  const completionText = completionStart >= 0 ? relevantText.slice(completionStart) : relevantText;
  const completionLowered = completionText.toLowerCase();
  const hasMarker = lowered.includes(marker.toLowerCase());
  const usedCursorAgent =
    lowered.includes("cursor_agent") || lowered.includes("cursor agent completed") || hasMarker;
  const completed =
    completionLowered.includes("cursor agent completed") ||
    completionLowered.includes("ran successfully:") ||
    completionLowered.includes("implementation report") ||
    hasMarker;
  const blocked = hasBlocker(completionText);
  return { usedCursorAgent, completed, blocked, completionText };
}

function request(ws, method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => reject(new Error(`timeout on ${method}`)), timeoutMs);
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
      const err = message?.error || {};
      reject(
        new Error(
          `${method} failed [${err.code || "UNAVAILABLE"}]: ${err.message || "request failed"} ${
            err.details ? JSON.stringify(err.details) : ""
          }`.trim(),
        ),
      );
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}

function gitChangedFiles(targetRepoAbs) {
  try {
    const out = execSync("git status --short", {
      cwd: targetRepoAbs,
      stdio: ["ignore", "pipe", "pipe"],
    })
      .toString("utf8")
      .trim();
    if (!out) return [];
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[A-Z?]{1,2}\s+/, ""));
  } catch {
    return [];
  }
}

function parseCompletionArtifact(raw, fallbackChangedFiles) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid completion artifact JSON: ${String(error.message || error)}`);
  }
  const success = Boolean(payload.success);
  const blocker = String(payload.blocker || "none");
  const changedFiles = Array.isArray(payload.changed_files) && payload.changed_files.length
    ? payload.changed_files
    : fallbackChangedFiles;
  return {
    success,
    blocker,
    summary: String(payload.summary || (success ? "cursor completion artifact success" : "cursor completion artifact failure")),
    changed_files: changedFiles,
    commands: Array.isArray(payload.commands) ? payload.commands : [],
    tests: String(payload.tests || ""),
    error: String(payload.error || ""),
  };
}

function buildPrompt(requestPayload, paths, completionPath) {
  const plan = fs.readFileSync(paths.planAbs, "utf8");
  const testPlan = fs.readFileSync(paths.testPlanAbs, "utf8");
  const taskId = requestPayload.task_id;
  const marker = `IMPLEMENTATION_RESULT:${taskId}`;
  return `You are the implementation backend for a local multi-agent POC.

Use the cursor_agent tool to modify code in this project.

Project:
- Correlation id: ${marker}
- Backend variant: cursor-openclaw
- Target repo on host: ${paths.targetRepoAbs}
- Target repo in task metadata: ${requestPayload.target_repo}
- Task id: ${taskId}

Hard constraints:
- Modify only files under ${paths.targetRepoAbs}.
- You MUST also write a completion artifact JSON to: ${completionPath}
- Implement the request using the plan and test plan below.
- If tests are needed, add or update focused tests in the target repo.
- Run the target repo test command if practical: npm test
- Do not read or print secrets from .env or any token file.
- Return a concise final report with changed files, commands run, test result, and blockers.
- The final report must include the exact correlation id line: ${marker}
- The final report must include either "Blocker: none" or "Blocker: <reason>".

Completion artifact contract:
- Write exactly one JSON object to ${completionPath}
- Required fields:
  - task_id: "${taskId}"
  - success: boolean
  - summary: string
  - blocker: "none" or blocker reason
  - changed_files: string[]
  - commands: string[]
  - tests: string
  - error: string (empty string if no error)
- If implementation succeeds, set success=true and blocker="none".
- If blocked or failed, set success=false and explain in blocker/error.

Task brief:
${requestPayload.task_brief}

Plan artifact:
${plan}

Test-plan artifact:
${testPlan}
`;
}

async function run(requestPayload, paths, logger) {
  const projectRoot = paths.projectRoot;
  const gatewayHttp = normalizeGatewayHostForLocalRunner(
    readEnvVar(projectRoot, "OPENCLAW_GATEWAY_URL") || "http://127.0.0.1:18789",
  );
  const gatewayWs = `${gatewayHttp.replace(/^http/i, "ws").replace(/\/$/, "")}/ws`;
  const origin = normalizeGatewayHostForLocalRunner(
    readEnvVar(projectRoot, "OPENCLAW_GATEWAY_ORIGIN") || "http://127.0.0.1",
  );
  const token = readEnvVar(projectRoot, "OPENCLAW_GATEWAY_TOKEN");
  const sessionBase = readEnvVar(projectRoot, "OPENCLAW_SESSION_KEY") || "agent:dev:main";
  const sessionKey = `${sessionBase}:${requestPayload.task_id}`;
  const scopes = ["operator.admin", "operator.read", "operator.write", "operator.approvals", "operator.pairing"];
  const timeoutMs = (Number(requestPayload.timeout_seconds || 300) + 30) * 1000;
  const completionPath = path.join(projectRoot, "agent", "jobs", `${requestPayload.task_id}.completion.json`);

  logger.info("cursor_openclaw_start", {
    task_id: requestPayload.task_id,
    ws: gatewayWs,
    sessionKey,
    timeoutMs,
    completionPath,
  });

  const marker = `IMPLEMENTATION_RESULT:${requestPayload.task_id}`;
  const prompt = buildPrompt(requestPayload, paths, completionPath);
  const headers = { origin };
  if (token) headers.authorization = `Bearer ${token}`;
  const WebSocketCtor = getWebSocketCtor();
  const ws = new WebSocketCtor(gatewayWs, { headers });

  try {
    if (fs.existsSync(completionPath)) {
      fs.rmSync(completionPath);
      logger.info("cursor_openclaw_completion_artifact_removed", { completionPath });
    }

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("websocket open timeout")), 5000);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("websocket open failed"));
      });
    });

    await request(
      ws,
      "connect",
      {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "openclaw-control-ui",
          version: "local-runner",
          platform: process.platform || "darwin",
          mode: "webchat",
          instanceId: `runner-${requestPayload.task_id}`,
        },
        role: "operator",
        scopes,
        caps: ["tool-events"],
        auth: token ? { token } : {},
        userAgent: "local-runner",
        locale: "en-US",
      },
      15000,
    );

    const sendResult = await request(
      ws,
      "chat.send",
      {
        sessionKey,
        message: prompt,
        deliver: false,
        idempotencyKey: `runner-${requestPayload.task_id}`,
      },
      30000,
    );
    logger.info("cursor_openclaw_chat_send_ok", { sendResult });

    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    let lastSummary = { messageCount: 0, text: "" };
    let consecutiveHistoryErrors = 0;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      if (fs.existsSync(completionPath)) {
        const completionRaw = fs.readFileSync(completionPath, "utf8");
        const fallbackChangedFiles = gitChangedFiles(paths.targetRepoAbs).map((rel) =>
          path.posix.join(requestPayload.target_repo, rel.replace(/\\/g, "/")),
        );
        const artifact = parseCompletionArtifact(completionRaw, fallbackChangedFiles);
        const blocked = artifact.blocker.toLowerCase() !== "none";
        return {
          state: artifact.success && !blocked ? "completed" : "failed",
          summary: artifact.summary,
          changed_files: artifact.changed_files,
          exit_code: artifact.success && !blocked ? 0 : 3,
          error_message: artifact.success && !blocked ? null : (artifact.error || artifact.blocker || "cursor_artifact_failed"),
          details: {
            completion_artifact_path: completionPath,
            commands: artifact.commands,
            tests: artifact.tests,
            marker,
          },
        };
      }
      try {
        const history = await request(ws, "chat.history", { sessionKey, limit: 40 }, 30000);
        lastSummary = summarizeHistory(history);
        consecutiveHistoryErrors = 0;
      } catch (error) {
        consecutiveHistoryErrors += 1;
        logger.warn("cursor_openclaw_history_poll_error", {
          error: String(error.message || error),
          consecutiveHistoryErrors,
        });
        if (consecutiveHistoryErrors >= 6) {
          return {
            state: "failed",
            summary: "OpenClaw cursor adapter failed",
            changed_files: [],
            exit_code: 3,
            error_message: `history_poll_failed: ${String(error.message || error)}`,
            details: {
              elapsed_ms: Date.now() - startedAt,
              last_summary: lastSummary.text.slice(-2000),
            },
          };
        }
        continue;
      }
      const completion = completionFromSummary(lastSummary.text, marker, requestPayload.task_id);
      if (completion.usedCursorAgent && completion.completed) {
        const changedFiles = gitChangedFiles(paths.targetRepoAbs).map((rel) =>
          path.posix.join(requestPayload.target_repo, rel.replace(/\\/g, "/")),
        );
        const state = completion.blocked ? "failed" : "completed";
        const summary = completion.blocked
          ? "cursor_agent completed with blocker"
          : "cursor_agent completed";
        return {
          state,
          summary,
          changed_files: changedFiles,
          exit_code: completion.blocked ? 3 : 0,
          error_message: completion.blocked ? "cursor_agent_blocked" : null,
          details: {
            send_result: sendResult,
            output: completion.completionText.slice(-10000),
            elapsed_ms: Date.now() - startedAt,
          },
        };
      }
    }

    const finalHistory = await request(ws, "chat.history", { sessionKey, limit: 60 }, 30000);
    lastSummary = summarizeHistory(finalHistory);
    const changedFiles = gitChangedFiles(paths.targetRepoAbs).map((rel) =>
      path.posix.join(requestPayload.target_repo, rel.replace(/\\/g, "/")),
    );
    return {
      state: "timeout",
      summary: "Timed out waiting for cursor completion artifact",
      changed_files: changedFiles,
      exit_code: 124,
      error_message: "cursor_completion_artifact_timeout",
      details: {
        completion_artifact_path: completionPath,
        output: lastSummary.text.slice(-10000),
      },
    };
  } catch (error) {
    return {
      state: "failed",
      summary: "OpenClaw cursor adapter failed",
      changed_files: [],
      exit_code: 3,
      error_message: String(error.message || error),
      details: {},
    };
  } finally {
    try {
      ws.close();
    } catch {
      // noop
    }
  }
}

module.exports = { run };
