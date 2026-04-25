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
const LOCK_TTL_SECONDS = 600;
const TARGET_REPO = "/files/target-repos/api";

function nowIso() {
  return new Date().toISOString();
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

function lockTask(fileName) {
  const runningPath = path.join(RUNNING_DIR, fileName);
  const lockPath = `${runningPath}.lock`;
  try {
    fs.writeFileSync(lockPath, `${os.hostname()}|${nowIso()}|${LOCK_TTL_SECONDS}\n`, { flag: "wx" });
    return lockPath;
  } catch {
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
    const planPath = path.join(PLAN_DIR, `${taskId}.plan.md`);
    const testPlanPath = path.join(TEST_DIR, `${taskId}.test-plan.md`);
    const buildPath = path.join(BUILD_DIR, `${taskId}.build.md`);

    if (fields.current_step !== "coding") {
      fs.rmSync(lockPath);
      continue;
    }
    if (!fs.existsSync(planPath)) throw new Error(`Missing plan artifact: ${planPath}`);
    if (!fs.existsSync(testPlanPath)) {
      fs.rmSync(lockPath);
      continue; // TDD gate: test-plan must exist first
    }
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
  fs.writeFileSync(path.join(ERROR_DIR, task.fileName), errorMd);
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
}

function updateTask(task, updateFields) {
  Object.assign(task.fields, updateFields);
  fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
}

function run(cmd, cwd = TARGET_REPO) {
  try {
    const out = execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: out.toString("utf8").trim() };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString("utf8") : "";
    const stderr = error.stderr ? error.stderr.toString("utf8") : "";
    return { ok: false, output: `${stdout}\n${stderr}`.trim(), code: error.status || 1 };
  }
}

function repoHasOpenClaw() {
  return run("which openclaw").ok;
}

function ensureHealthRoute() {
  const appPath = path.join(TARGET_REPO, "src/index.js");
  let source = fs.readFileSync(appPath, "utf8");
  if (source.includes("app.get(\"/health\"")) return "health route already exists";

  const marker = "module.exports = { app };";
  if (!source.includes(marker)) throw new Error("Cannot locate export marker in src/index.js");
  const route = `app.get("/health", (_req, res) => {\n  res.status(200).json({ status: "ok" });\n});\n\n`;
  source = source.replace(marker, `${route}${marker}`);
  fs.writeFileSync(appPath, source);
  return "added /health route";
}

function fixReadmeHeading() {
  const readmePath = path.join(TARGET_REPO, "README.md");
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

function implementTask(task) {
  const title = String(task.fields.title || "").toLowerCase();
  const body = String(task.body || "").toLowerCase();

  if (title.includes("impossible requirement") || title.includes("reverse time") || body.includes("reverse time")) {
    return {
      ok: false,
      classification: "impossible_requirement",
      exitCode: 2,
      summary: "Task is intentionally impossible; trigger retry policy",
      output: "Cannot implement requirement: reverse time",
    };
  }

  if (title.includes("health endpoint")) {
    const summary = ensureHealthRoute();
    return { ok: true, classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (title.includes("readme heading typo")) {
    const summary = fixReadmeHeading();
    return { ok: true, classification: "implemented", exitCode: 0, summary, output: summary };
  }

  if (repoHasOpenClaw()) {
    const cmd = `openclaw run --repo ${TARGET_REPO} --plan ${task.planPath} --test-plan ${task.testPlanPath} --output ${task.buildPath} --branch task/${task.fields.task_id}`;
    const result = run(cmd, TARGET_REPO);
    return {
      ok: result.ok,
      classification: result.ok ? "implemented" : "openclaw_failed",
      exitCode: result.ok ? 0 : result.code || 1,
      summary: "Executed OpenClaw implementation",
      output: result.output,
    };
  }

  return {
    ok: false,
    classification: "needs_human",
    exitCode: 3,
    summary: "OpenClaw is not available in n8n worker",
    output: "OpenClaw command not found. Manual implementation required.",
  };
}

function collectRepoChangeSummary() {
  const short = run("git status --short --untracked-files=no");
  if (!short.ok) return "NO_GIT_STATUS";
  const summary = short.output.trim();
  return summary || "NO_CHANGES";
}

function writeBuildArtifact(task, result, repoChangeSummary) {
  const content = `---
task_id: ${task.fields.task_id}
artifact: build
agent_role: Implementation Agent
pipeline: ${task.fields.pipeline}
pipeline_version: ${task.fields.pipeline_version}
revision: ${task.fields.revision || "0"}
source_step: coding
created_at: ${nowIso()}
---

# Build Result: ${task.fields.title}

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
  fs.writeFileSync(task.buildPath, content);
}

function handleFailure(task, result) {
  const retryCount = Number(task.fields.retry_count || "0") + 1;
  const maxRetry = Number(task.fields.max_retry || "3");
  task.fields.retry_count = String(retryCount);
  task.fields.blocked_by = result.classification;

  if (retryCount >= maxRetry) {
    routeToError(task, `${result.classification}: ${result.summary}`);
    return { status: "ERROR_ROUTED", task_id: task.fields.task_id, reason: result.classification };
  }

  updateTask(task, { current_step: "coding", status: "running" });
  fs.rmSync(task.lockPath);
  return { status: "RETRY_SCHEDULED", task_id: task.fields.task_id, reason: result.classification };
}

const task = selectTask();
if (!task) return [{ json: { status: "NO_TASK" } }];

try {
  const result = implementTask(task);
  const changeSummary = result.ok ? collectRepoChangeSummary() : "NO_CHANGES";
  writeBuildArtifact(task, result, changeSummary);

  if (!result.ok) {
    return [{ json: handleFailure(task, result) }];
  }

  updateTask(task, { current_step: "test_running", status: "running", blocked_by: "" });
  fs.rmSync(task.lockPath);
  return [{ json: { status: "BUILD_CREATED", task_id: task.fields.task_id, path: task.buildPath } }];
} catch (error) {
  routeToError(task, String(error.message || error));
  return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id, error: String(error.message || error) } }];
}
