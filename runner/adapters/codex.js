"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function gitChangedFiles(targetRepoAbs, targetRepoRel) {
  const probe = spawnSync("git", ["status", "--short"], {
    cwd: targetRepoAbs,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
  if (probe.error || probe.status !== 0) return [];
  const output = String(probe.stdout || "").trim();
  if (!output) return [];
  return output
    .split("\n")
    .map((line) => line.trim().replace(/^[A-Z?]{1,2}\s+/, ""))
    .filter(Boolean)
    .map((rel) => path.posix.join(targetRepoRel, rel.replace(/\\/g, "/")));
}

function parseCompletion(raw, fallbackChangedFiles) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid completion JSON: ${String(error.message || error)}`);
  }
  const success = Boolean(payload.success);
  const blocker = String(payload.blocker || "none");
  const blocked = blocker.toLowerCase() !== "none";
  const changedFiles =
    Array.isArray(payload.changed_files) && payload.changed_files.length
      ? payload.changed_files.map((value) => String(value).replace(/\\/g, "/"))
      : fallbackChangedFiles;
  return {
    success: success && !blocked,
    summary: String(payload.summary || (success && !blocked ? "codex completed" : "codex failed")),
    changed_files: changedFiles,
    error_message: success && !blocked ? null : String(payload.error || blocker || "codex_adapter_failed"),
    details: {
      blocker,
      commands: Array.isArray(payload.commands) ? payload.commands : [],
      tests: String(payload.tests || ""),
      completion_payload: payload,
    },
  };
}

function buildPrompt(requestPayload, completionPath) {
  return `You are the implementation backend for a local multi-agent POC.

Return exactly one JSON object to ${completionPath} with this schema:
{
  "task_id": "${requestPayload.task_id}",
  "success": boolean,
  "summary": string,
  "blocker": "none" | string,
  "changed_files": string[],
  "commands": string[],
  "tests": string,
  "error": string
}

Rules:
- Modify only files under ${requestPayload.target_repo}.
- Run npm test if practical.
- Do not print or read secrets.
- If blocked, set success=false and explain blocker/error.

Task brief:
${requestPayload.task_brief}
`;
}

async function run(requestPayload, paths, logger) {
  const executable = process.env.CODEX_EXECUTABLE || "codex";
  const sandbox = process.env.CODEX_SANDBOX || "workspace-write";
  const timeoutSeconds = Number(requestPayload.timeout_seconds || 300);
  const timeoutMs = (Number.isFinite(timeoutSeconds) ? timeoutSeconds : 300) * 1000;
  const jobsDir = path.join(paths.projectRoot, "agent", "jobs");
  const completionPath = path.join(jobsDir, `${requestPayload.task_id}.completion.json`);
  const prompt = buildPrompt(requestPayload, completionPath);

  try {
    if (fs.existsSync(completionPath)) fs.rmSync(completionPath);
  } catch (error) {
    logger.warn("codex_completion_cleanup_failed", { error: String(error.message || error), completionPath });
  }

  const args = [
    "exec",
    "--cd",
    paths.targetRepoAbs,
    "--add-dir",
    jobsDir,
    "--sandbox",
    sandbox,
    "--ask-for-approval",
    "never",
    "--output-last-message",
    completionPath,
    "-",
  ];
  logger.info("codex_exec_start", { executable, args, completionPath, timeoutMs });

  const proc = spawnSync(executable, args, {
    input: prompt,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });

  if (proc.error) {
    const code = proc.error.code || "";
    const message =
      code === "ENOENT"
        ? `codex_executable_not_found:${executable}`
        : `codex_exec_error:${String(proc.error.message || proc.error)}`;
    logger.error("codex_exec_failed", { error: message });
    return {
      state: "failed",
      summary: "Codex adapter failed to execute",
      changed_files: [],
      exit_code: 3,
      error_message: message,
      details: {},
    };
  }

  if (proc.signal === "SIGTERM" || proc.signal === "SIGKILL") {
    logger.error("codex_exec_timeout", { signal: proc.signal });
    return {
      state: "timeout",
      summary: "Codex adapter timed out",
      changed_files: [],
      exit_code: 124,
      error_message: "codex_exec_timeout",
      details: {},
    };
  }

  if (proc.status !== 0) {
    logger.error("codex_exec_nonzero", {
      status: proc.status,
      stderr: String(proc.stderr || "").slice(-4000),
    });
    return {
      state: "failed",
      summary: "Codex adapter returned non-zero",
      changed_files: [],
      exit_code: Number(proc.status || 3),
      error_message: "codex_exec_nonzero",
      details: {
        stderr: String(proc.stderr || "").slice(-4000),
      },
    };
  }

  if (!fs.existsSync(completionPath)) {
    logger.error("codex_completion_missing", { completionPath });
    return {
      state: "failed",
      summary: "Codex completion artifact missing",
      changed_files: [],
      exit_code: 3,
      error_message: "codex_completion_missing",
      details: {},
    };
  }

  const fallbackChangedFiles = gitChangedFiles(paths.targetRepoAbs, requestPayload.target_repo);
  const raw = fs.readFileSync(completionPath, "utf8");
  try {
    const parsed = parseCompletion(raw, fallbackChangedFiles);
    return {
      state: parsed.success ? "completed" : "failed",
      summary: parsed.summary,
      changed_files: parsed.changed_files,
      exit_code: parsed.success ? 0 : 3,
      error_message: parsed.error_message,
      details: parsed.details,
    };
  } catch (error) {
    logger.error("codex_completion_invalid", { error: String(error.message || error) });
    return {
      state: "failed",
      summary: "Codex completion artifact invalid",
      changed_files: fallbackChangedFiles,
      exit_code: 3,
      error_message: "codex_completion_invalid_json",
      details: {},
    };
  }
}

module.exports = { run };
