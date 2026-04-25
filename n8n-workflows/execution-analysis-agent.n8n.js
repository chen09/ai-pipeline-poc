const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const AGENT_ROOT = "/files/agent";
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
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
    const buildPath = path.join(BUILD_DIR, `${taskId}.build.md`);
    const testRunPath = path.join(TEST_DIR, `${taskId}.test-run.md`);
    const testPlanPath = path.join(TEST_DIR, `${taskId}.test-plan.md`);

    if (fields.current_step !== "test_running") {
      fs.rmSync(lockPath);
      continue;
    }
    if (!fs.existsSync(buildPath) || !fs.existsSync(testPlanPath)) {
      fs.rmSync(lockPath);
      continue;
    }
    return {
      fileName,
      runningPath,
      lockPath,
      markdown,
      fields,
      body,
      buildPath,
      testPlanPath,
      testRunPath,
    };
  }
  return null;
}

function runTests() {
  try {
    const output = execSync("npm test", {
      cwd: TARGET_REPO,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: output.toString("utf8"), exitCode: 0 };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString("utf8") : "";
    const stderr = error.stderr ? error.stderr.toString("utf8") : "";
    return { ok: false, output: `${stdout}\n${stderr}`.trim(), exitCode: error.status || 1 };
  }
}

function classifyFailure(output) {
  const text = String(output || "");
  if (text.includes("reverse time")) return "plan_ambiguity";
  if (text.includes("No test files found")) return "plan_ambiguity";
  return "implementation_failure";
}

function writeTestRunArtifact(task, result, classification, recommendation) {
  const content = `---
task_id: ${task.fields.task_id}
artifact: test-run
agent_role: Execution & Analysis Agent
pipeline: ${task.fields.pipeline}
pipeline_version: ${task.fields.pipeline_version}
revision: ${task.fields.revision || "0"}
source_step: test_running
created_at: ${nowIso()}
---

# Test Run: ${task.fields.title}

- exit_code: ${result.exitCode}
- classification: ${classification}
- route_recommendation: ${recommendation}
- build_ref: ${task.buildPath}
- test_plan_ref: ${task.testPlanPath}

## Output

\`\`\`
${result.output.trim()}
\`\`\`
`;
  fs.writeFileSync(task.testRunPath, content);
}

function routeToError(task, reason) {
  const fields = { ...task.fields };
  fields.status = "error";
  fields.current_step = "error";
  fields.blocked_by = "Execution & Analysis Agent";
  const text = stringifyFrontmatter(
    fields,
    `${task.body}\n\n## Execution & Analysis Agent Error\n\n- Time: ${nowIso()}\n- Reason: ${reason}\n`,
  );
  fs.writeFileSync(path.join(ERROR_DIR, task.fileName), text);
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
}

const task = selectTask();
if (!task) return [{ json: { status: "NO_TASK" } }];

try {
  const result = runTests();

  if (result.ok) {
    writeTestRunArtifact(task, result, "pass", "reviewing");
    task.fields.current_step = "reviewing";
    task.fields.status = "running";
    task.fields.blocked_by = "";
    fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
    fs.rmSync(task.lockPath);
    return [{ json: { status: "TEST_PASS", task_id: task.fields.task_id, path: task.testRunPath } }];
  }

  const classification = classifyFailure(result.output);
  const recommendation = classification === "plan_ambiguity" ? "planning" : "coding";
  writeTestRunArtifact(task, result, classification, recommendation);

  if (classification === "plan_ambiguity") {
    const revision = Number(task.fields.revision || "0") + 1;
    const maxRetry = Number(task.fields.max_retry || "3");
    task.fields.revision = String(revision);
    task.fields.retry_count = String(Number(task.fields.retry_count || "0") + 1);
    task.fields.current_step = "planning";
    task.fields.blocked_by = "plan_ambiguity";

    if (revision >= maxRetry) {
      routeToError(task, "plan_ambiguity exceeded max_retry");
      return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id } }];
    }

    fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
    fs.rmSync(task.lockPath);
    return [{ json: { status: "REROUTED_TO_PLANNING", task_id: task.fields.task_id } }];
  }

  const retryCount = Number(task.fields.retry_count || "0") + 1;
  const maxRetry = Number(task.fields.max_retry || "3");
  task.fields.retry_count = String(retryCount);
  task.fields.current_step = "coding";
  task.fields.blocked_by = "implementation_failure";

  if (retryCount >= maxRetry) {
    routeToError(task, "implementation_failure exceeded max_retry");
    return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id } }];
  }

  fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
  fs.rmSync(task.lockPath);
  return [{ json: { status: "REROUTED_TO_CODING", task_id: task.fields.task_id } }];
} catch (error) {
  routeToError(task, String(error.message || error));
  return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id, error: String(error.message || error) } }];
}
