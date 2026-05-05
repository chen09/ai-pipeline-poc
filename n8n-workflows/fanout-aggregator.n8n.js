const fs = require("fs");
const path = require("path");

const AGENT_ROOT = "/files/agent";
const FANOUT_DIR = path.join(AGENT_ROOT, "fanout");
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const DONE_DIR = path.join(AGENT_ROOT, "done");
const ERROR_DIR = path.join(AGENT_ROOT, "error");

function nowIso() {
  return new Date().toISOString();
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) throw new Error("Fanout artifact is missing YAML frontmatter");
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) throw new Error("Fanout artifact frontmatter is not closed with ---");
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

function parseChildIds(markdown) {
  const ids = [];
  for (const match of markdown.matchAll(/task_id:\s*([A-Z0-9]+)/g)) {
    const taskId = match[1];
    if (!ids.includes(taskId)) ids.push(taskId);
  }
  return ids.slice(1);
}

function classifyChild(parentTaskId, childTaskId) {
  if (fs.existsSync(path.join(DONE_DIR, childTaskId))) return "done";
  if (fs.existsSync(path.join(ERROR_DIR, childTaskId))) return "error";
  if (fs.existsSync(ERROR_DIR)) {
    for (const fileName of fs.readdirSync(ERROR_DIR)) {
      if (!fileName.endsWith(".md")) continue;
      const errorPath = path.join(ERROR_DIR, fileName);
      try {
        if (fs.readFileSync(errorPath, "utf8").includes(`task_id: ${childTaskId}`)) return "error";
      } catch {
        continue;
      }
    }
  }

  if (fs.existsSync(RUNNING_DIR)) {
    for (const fileName of fs.readdirSync(RUNNING_DIR)) {
      if (!fileName.endsWith(".md")) continue;
      const taskPath = path.join(RUNNING_DIR, fileName);
      try {
        if (fs.readFileSync(taskPath, "utf8").includes(`task_id: ${childTaskId}`)) return "running";
      } catch {
        continue;
      }
    }
  }

  const stagedDir = path.join(FANOUT_DIR, "staged", parentTaskId);
  if (fs.existsSync(stagedDir)) {
    for (const fileName of fs.readdirSync(stagedDir)) {
      if (!fileName.endsWith(".md")) continue;
      const taskPath = path.join(stagedDir, fileName);
      try {
        if (fs.readFileSync(taskPath, "utf8").includes(`task_id: ${childTaskId}`)) return "staged";
      } catch {
        continue;
      }
    }
  }

  return "missing";
}

function aggregateStatus(statuses) {
  if (statuses.some((entry) => entry.status === "error")) return "error";
  if (statuses.length > 0 && statuses.every((entry) => entry.status === "done")) return "done";
  return "waiting";
}

function cleanupOrphanLocks() {
  if (!fs.existsSync(RUNNING_DIR)) return 0;
  let removed = 0;
  for (const fileName of fs.readdirSync(RUNNING_DIR)) {
    if (!fileName.endsWith(".lock")) continue;
    const lockPath = path.join(RUNNING_DIR, fileName);
    const taskPath = lockPath.slice(0, -".lock".length);
    if (fs.existsSync(taskPath)) continue;
    fs.rmSync(lockPath);
    removed += 1;
  }
  return removed;
}

function writeParentResult(parentTaskId, fanoutPath, fields, body, statuses, status) {
  const terminalDir = status === "done" ? path.join(DONE_DIR, parentTaskId) : ERROR_DIR;
  fs.mkdirSync(terminalDir, { recursive: true });

  const resultPath = status === "done"
    ? path.join(terminalDir, `${parentTaskId}.fanout-result.md`)
    : path.join(terminalDir, `${parentTaskId}.fanout-result.md`);
  const fanoutDestPath = status === "done"
    ? path.join(terminalDir, path.basename(fanoutPath))
    : path.join(terminalDir, path.basename(fanoutPath));

  const resultFrontmatter = [
    "---",
    `task_id: ${parentTaskId}`,
    "artifact: fanout-result",
    "agent_role: Fanout Aggregator",
    "pipeline: multi-repo-default",
    `pipeline_version: ${fields.pipeline_version || "v0.1"}`,
    `status: ${status}`,
    "source_step: fanout_waiting",
    `created_at: ${nowIso()}`,
    "---",
    "",
  ].join("\n");

  const rows = statuses.map((entry) => `| ${entry.taskId} | ${entry.status} |`).join("\n");
  const resultBody = `# Fanout Result: ${parentTaskId}

## Aggregate

- aggregate_status: ${status}
- fanout_ref: ${fanoutDestPath}

## Children

| Child Task ID | Status |
| --- | --- |
${rows}

## Source Fanout Body

${body.trim()}
`;

  fs.writeFileSync(resultPath, `${resultFrontmatter}${resultBody}`);
  if (fs.existsSync(fanoutPath)) fs.renameSync(fanoutPath, fanoutDestPath);
  return { resultPath, fanoutDestPath };
}

function processFanout(fanoutPath) {
  const markdown = fs.readFileSync(fanoutPath, "utf8");
  const { fields, body } = parseFrontmatter(markdown);
  const parentTaskId = fields.task_id;
  if (!parentTaskId) throw new Error(`Missing task_id in fanout artifact: ${fanoutPath}`);
  if (fs.existsSync(path.join(DONE_DIR, parentTaskId))) {
    return { parentTaskId, status: "ALREADY_DONE" };
  }

  const childIds = parseChildIds(markdown);
  if (childIds.length === 0) throw new Error(`No children found in fanout artifact: ${fanoutPath}`);
  const statuses = childIds.map((taskId) => ({ taskId, status: classifyChild(parentTaskId, taskId) }));
  const aggregate = aggregateStatus(statuses);

  if (aggregate === "waiting") {
    return { parentTaskId, status: "WAITING", statuses };
  }

  const terminal = writeParentResult(parentTaskId, fanoutPath, fields, body, statuses, aggregate);
  return { parentTaskId, status: aggregate === "done" ? "PARENT_DONE" : "PARENT_ERROR", statuses, terminal };
}

const removedLocks = cleanupOrphanLocks();

if (!fs.existsSync(FANOUT_DIR)) {
  return [{ json: { status: "NO_FANOUT_DIR", removed_orphan_locks: removedLocks } }];
}

const fanoutFiles = fs.readdirSync(FANOUT_DIR)
  .filter((fileName) => fileName.endsWith(".fanout.md"))
  .sort();

if (fanoutFiles.length === 0) {
  return [{ json: { status: "NO_FANOUT", removed_orphan_locks: removedLocks } }];
}

const results = [];
for (const fileName of fanoutFiles) {
  results.push(processFanout(path.join(FANOUT_DIR, fileName)));
}

return [{ json: { status: "FANOUT_AGGREGATED", removed_orphan_locks: removedLocks, results } }];
