const fs = require("fs");
const path = require("path");

const AGENT_ROOT = "/files/agent";
const FANOUT_DIR = path.join(AGENT_ROOT, "fanout");
const STAGED_ROOT = path.join(FANOUT_DIR, "staged");
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const DONE_DIR = path.join(AGENT_ROOT, "done");
const ERROR_DIR = path.join(AGENT_ROOT, "error");

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return {};
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return {};
  const raw = markdown.slice(4, end).trim();
  const fields = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    fields[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
  }
  return fields;
}

function parseDependsOn(value) {
  return Array.from(String(value || "").matchAll(/[A-Z0-9]+/g)).map((match) => match[0]);
}

function dependenciesDone(dependencies) {
  return dependencies.every((taskId) => fs.existsSync(path.join(DONE_DIR, taskId)));
}

function hasTerminalState(taskId) {
  return fs.existsSync(path.join(DONE_DIR, taskId)) || fs.existsSync(path.join(ERROR_DIR, taskId));
}

function cleanupEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;
    if (fs.readdirSync(entryPath).length === 0) {
      fs.rmSync(entryPath, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

function releaseReadyChildren() {
  if (!fs.existsSync(STAGED_ROOT)) {
    return { released: [], waiting: [], skipped: [], removed_empty_dirs: 0 };
  }

  fs.mkdirSync(RUNNING_DIR, { recursive: true });

  const released = [];
  const waiting = [];
  const skipped = [];

  for (const parentTaskId of fs.readdirSync(STAGED_ROOT).sort()) {
    const stagedDir = path.join(STAGED_ROOT, parentTaskId);
    if (!fs.statSync(stagedDir).isDirectory()) continue;

    for (const fileName of fs.readdirSync(stagedDir).filter((name) => name.endsWith(".md")).sort()) {
      const taskPath = path.join(stagedDir, fileName);
      const markdown = fs.readFileSync(taskPath, "utf8");
      const fields = parseFrontmatter(markdown);
      const taskId = fields.task_id;
      const dependencies = parseDependsOn(fields.depends_on);

      if (!taskId) {
        skipped.push({ parentTaskId, fileName, reason: "missing_task_id" });
        continue;
      }

      if (hasTerminalState(taskId)) {
        fs.rmSync(taskPath);
        skipped.push({ parentTaskId, taskId, fileName, reason: "already_terminal" });
        continue;
      }

      if (!dependenciesDone(dependencies)) {
        waiting.push({ parentTaskId, taskId, fileName, depends_on: dependencies });
        continue;
      }

      const destination = path.join(RUNNING_DIR, fileName);
      if (fs.existsSync(destination) || fs.existsSync(`${destination}.lock`)) {
        waiting.push({ parentTaskId, taskId, fileName, reason: "running_destination_exists" });
        continue;
      }

      fs.renameSync(taskPath, destination);
      released.push({ parentTaskId, taskId, fileName, destination });
    }
  }

  const removedEmptyDirs = cleanupEmptyDirectories(STAGED_ROOT);
  return { released, waiting, skipped, removed_empty_dirs: removedEmptyDirs };
}

const result = releaseReadyChildren();
return [{ json: { status: "FANOUT_CHILD_RELEASE_CHECKED", ...result } }];
