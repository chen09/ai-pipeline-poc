"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const AGENT_DIR = path.join(PROJECT_ROOT, "agent");
const JOBS_DIR = path.join(AGENT_DIR, "jobs");
const POLL_MS = Number(process.env.LOCAL_RUNNER_POLL_MS || 5000);
const HEARTBEAT_MS = Number(process.env.LOCAL_RUNNER_HEARTBEAT_MS || 15000);
const DEFAULT_TIMEOUT_SECONDS = 300;
const TERMINAL_STATES = new Set(["completed", "failed", "timeout", "cancelled"]);

let currentJob = null;
let stopping = false;

const adapters = {
  "cursor-openclaw": require("./adapters/cursor-openclaw"),
  hermes: require("./adapters/hermes"),
  codex: require("./adapters/codex"),
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    once: args.includes("--once"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function ensureDirs(taskId) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  if (taskId) fs.mkdirSync(path.join(JOBS_DIR, `${taskId}.logs`), { recursive: true });
}

function jobPaths(taskId) {
  return {
    requestPath: path.join(JOBS_DIR, `${taskId}.request.json`),
    statusPath: path.join(JOBS_DIR, `${taskId}.status.json`),
    resultPath: path.join(JOBS_DIR, `${taskId}.result.json`),
    logPath: path.join(JOBS_DIR, `${taskId}.logs`, "adapter.jsonl"),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(tmpPath, content, "utf8");
  fs.renameSync(tmpPath, filePath);
  const verify = fs.readFileSync(filePath, "utf8");
  if (verify !== content) {
    throw new Error(`write verification mismatch for ${filePath}`);
  }
}

function normalizeChangedFiles(rawChangedFiles, targetRepo) {
  if (!Array.isArray(rawChangedFiles)) return [];
  const targetRepoPosix = String(targetRepo || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const projectRootPosix = PROJECT_ROOT.replace(/\\/g, "/");
  const normalized = [];
  const seen = new Set();

  for (const value of rawChangedFiles) {
    if (typeof value !== "string") continue;
    let item = value.trim();
    if (!item) continue;
    item = item.replace(/\\/g, "/");

    if (item.startsWith(`${projectRootPosix}/`)) {
      item = item.slice(projectRootPosix.length + 1);
    }
    item = item.replace(/^\/+/, "");
    if (item.startsWith("./")) item = item.slice(2);
    item = path.posix.normalize(item);
    if (!item || item === "." || item.startsWith("../")) continue;

    let relPath;
    if (item === targetRepoPosix || item.startsWith(`${targetRepoPosix}/`)) {
      relPath = item;
    } else if (item.startsWith("target-repos/")) {
      relPath = item;
    } else {
      relPath = path.posix.join(targetRepoPosix, item);
    }

    if (seen.has(relPath)) continue;
    seen.add(relPath);
    normalized.push(relPath);
  }

  return normalized;
}

function createLogger(taskId) {
  const { logPath } = jobPaths(taskId);
  ensureDirs(taskId);
  function write(level, event, data = {}) {
    const line = JSON.stringify({
      at: nowIso(),
      task_id: taskId,
      level,
      event,
      ...data,
    });
    fs.appendFileSync(logPath, `${line}\n`, "utf8");
  }
  return {
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, data) => write("error", event, data),
  };
}

function updateStatus(taskId, patch) {
  const { statusPath } = jobPaths(taskId);
  const existing = readJsonIfExists(statusPath) || {};
  const merged = {
    task_id: taskId,
    backend: existing.backend || patch.backend || "cursor-openclaw",
    state: patch.state || existing.state || "queued",
    started_at: existing.started_at || patch.started_at || nowIso(),
    updated_at: nowIso(),
    pid: process.pid,
    ...(existing.message ? { message: existing.message } : {}),
    ...(patch.message ? { message: patch.message } : {}),
  };
  writeJsonAtomic(statusPath, merged);
  return merged;
}

function tryClaimJob(requestPayload) {
  const taskId = requestPayload.task_id;
  const { statusPath, resultPath } = jobPaths(taskId);
  if (fs.existsSync(resultPath)) return { claimed: false, reason: "result_exists" };

  if (fs.existsSync(statusPath)) {
    const status = readJson(statusPath);
    if (status.state !== "queued") {
      return { claimed: false, reason: `status_${status.state}` };
    }
  }

  const statusContent = {
    task_id: taskId,
    backend: requestPayload.backend,
    state: "claimed",
    started_at: nowIso(),
    updated_at: nowIso(),
    pid: process.pid,
    message: "claimed by local runner",
  };

  try {
    const fd = fs.openSync(statusPath, "wx");
    fs.writeFileSync(fd, `${JSON.stringify(statusContent, null, 2)}\n`, "utf8");
    fs.closeSync(fd);
    return { claimed: true };
  } catch (error) {
    if (error && error.code === "EEXIST") return { claimed: false, reason: "already_claimed" };
    throw error;
  }
}

function validateRequest(payload) {
  const required = ["task_id", "target_repo", "backend", "plan_ref", "test_plan_ref", "task_brief", "created_at"];
  for (const key of required) {
    if (!payload[key]) throw new Error(`missing request field: ${key}`);
  }
  if (!adapters[payload.backend]) {
    throw new Error(`unsupported backend: ${payload.backend}`);
  }
}

async function runOneJob(requestPath) {
  const requestPayload = readJson(requestPath);
  validateRequest(requestPayload);
  const taskId = requestPayload.task_id;
  const logger = createLogger(taskId);

  const claim = tryClaimJob(requestPayload);
  if (!claim.claimed) return false;

  currentJob = taskId;
  logger.info("job_claimed", { requestPath, hostname: os.hostname() });
  updateStatus(taskId, { state: "running", message: "adapter running" });

  const planAbs = path.join(PROJECT_ROOT, requestPayload.plan_ref);
  const testPlanAbs = path.join(PROJECT_ROOT, requestPayload.test_plan_ref);
  const targetRepoAbs = path.join(PROJECT_ROOT, requestPayload.target_repo);
  const timeoutSeconds = Number(requestPayload.timeout_seconds || DEFAULT_TIMEOUT_SECONDS);
  const adapter = adapters[requestPayload.backend];

  let adapterResult;
  let heartbeatId = null;
  let heartbeatCount = 0;
  try {
    if (HEARTBEAT_MS > 0) {
      heartbeatId = setInterval(() => {
        heartbeatCount += 1;
        try {
          updateStatus(taskId, { state: "running", message: "adapter running" });
          logger.info("job_heartbeat", { heartbeatCount });
        } catch (error) {
          logger.warn("job_heartbeat_write_failed", { error: String(error.message || error) });
        }
      }, HEARTBEAT_MS);
    }

    let timeoutId = null;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(
        () =>
          resolve({
            state: "timeout",
            summary: "Runner timeout while waiting adapter result",
            changed_files: [],
            exit_code: 124,
            error_message: "runner_timeout",
            details: {},
          }),
        timeoutSeconds * 1000,
      );
    });
    adapterResult = await Promise.race([
      adapter.run(
        requestPayload,
        { projectRoot: PROJECT_ROOT, planAbs, testPlanAbs, targetRepoAbs },
        logger,
      ),
      timeoutPromise,
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    if (heartbeatId) clearInterval(heartbeatId);
  } catch (error) {
    if (heartbeatId) clearInterval(heartbeatId);
    adapterResult = {
      state: "failed",
      summary: "Runner caught adapter exception",
      changed_files: [],
      exit_code: 3,
      error_message: String(error.message || error),
      details: {},
    };
  }

  const terminalState = TERMINAL_STATES.has(adapterResult.state) ? adapterResult.state : "failed";
  const { resultPath } = jobPaths(taskId);
  const result = {
    task_id: taskId,
    state: terminalState,
    backend: requestPayload.backend,
    summary: adapterResult.summary || "implementation job finished",
    changed_files: normalizeChangedFiles(adapterResult.changed_files, requestPayload.target_repo),
    exit_code: Number.isInteger(adapterResult.exit_code) ? adapterResult.exit_code : terminalState === "completed" ? 0 : 3,
    error_message: adapterResult.error_message || null,
    details: adapterResult.details || {},
    completed_at: nowIso(),
  };
  writeJsonAtomic(resultPath, result);
  updateStatus(taskId, {
    state: terminalState,
    message: terminalState === "completed" ? "adapter completed" : `adapter ${terminalState}`,
  });
  logger.info("job_finished", { terminalState, resultPath });
  currentJob = null;
  return true;
}

function listRequestFiles() {
  ensureDirs();
  return fs
    .readdirSync(JOBS_DIR)
    .filter((name) => name.endsWith(".request.json"))
    .sort()
    .map((name) => path.join(JOBS_DIR, name));
}

async function loop({ once }) {
  do {
    const requestFiles = listRequestFiles();
    let didWork = false;
    for (const requestPath of requestFiles) {
      if (stopping) return;
      const worked = await runOneJob(requestPath);
      if (worked) didWork = true;
    }
    if (once) break;
    if (!didWork) await sleep(POLL_MS);
  } while (!stopping);
}

function installSignalHandlers() {
  const onStop = () => {
    stopping = true;
    if (!currentJob) return;
    try {
      updateStatus(currentJob, { state: "cancelled", message: "runner terminated by signal" });
      const { resultPath } = jobPaths(currentJob);
      if (!fs.existsSync(resultPath)) {
        writeJsonAtomic(resultPath, {
          task_id: currentJob,
          state: "cancelled",
          backend: readJson(jobPaths(currentJob).statusPath).backend,
          summary: "Runner terminated by signal",
          changed_files: [],
          exit_code: 130,
          error_message: "signal_terminated",
          details: {},
          completed_at: nowIso(),
        });
      }
    } catch {
      // best effort cleanup
    }
  };
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);
}

function printHelp() {
  console.log("Usage: node runner/runner.js [--once] [--help]");
  console.log("");
  console.log("Options:");
  console.log("  --once   Process currently queued requests once, then exit.");
  console.log("  --help   Show this message.");
  console.log("");
  console.log(`Defaults: poll interval ${POLL_MS}ms via LOCAL_RUNNER_POLL_MS`);
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    printHelp();
    return;
  }
  installSignalHandlers();
  ensureDirs();
  await loop({ once: args.once });
}

main().catch((error) => {
  console.error(`[local-runner] fatal: ${String(error.message || error)}`);
  process.exitCode = 1;
});
