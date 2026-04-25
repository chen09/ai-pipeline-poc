const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { URL } = require("url");

const AGENT_ROOT = "/files/agent";
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const PLAN_DIR = path.join(AGENT_ROOT, "plan");
const TEST_DIR = path.join(AGENT_ROOT, "test");
const BUILD_DIR = path.join(AGENT_ROOT, "build");
const REVIEW_DIR = path.join(AGENT_ROOT, "review");
const DONE_DIR = path.join(AGENT_ROOT, "done");
const ERROR_DIR = path.join(AGENT_ROOT, "error");
const LOCK_TTL_SECONDS = 600;

const VALID_VERDICTS = ["pass", "plan_issue", "code_issue", "test_issue", "critical"];

// ─── helpers ───────────────────────────────────────────────────────────────

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
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const sep = t.indexOf(":");
    if (sep === -1) continue;
    fields[t.slice(0, sep).trim()] = t.slice(sep + 1).trim();
  }
  return { fields, body };
}

function stringifyFrontmatter(fields, body) {
  const orderedKeys = [
    "task_id", "title", "created_at", "status", "current_step",
    "pipeline", "pipeline_version", "revision", "retry_count", "max_retry",
    "target_repo", "priority", "blocked_by",
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
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const sep = t.indexOf("=");
      if (sep === -1) continue;
      if (t.slice(0, sep) === name) return t.slice(sep + 1);
    }
  }
  return "";
}

function postJson(url, { headers = {}, body }) {
  const parsed = new URL(url);
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { text += c; });
        res.on("end", () => resolve({ statusCode: res.statusCode || 0, text }));
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ─── lock / task selection ──────────────────────────────────────────────────

function lockTask(fileName) {
  const lockPath = `${path.join(RUNNING_DIR, fileName)}.lock`;
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

    if (fields.current_step !== "reviewing") { fs.rmSync(lockPath); continue; }

    const planPath    = path.join(PLAN_DIR,  `${taskId}.plan.md`);
    const testPlanPath = path.join(TEST_DIR, `${taskId}.test-plan.md`);
    const buildPath   = path.join(BUILD_DIR, `${taskId}.build.md`);
    const testRunPath = path.join(TEST_DIR,  `${taskId}.test-run.md`);

    if (!fs.existsSync(planPath) || !fs.existsSync(testPlanPath) ||
        !fs.existsSync(buildPath) || !fs.existsSync(testRunPath)) {
      fs.rmSync(lockPath);
      continue; // skip if any required artifact is missing
    }

    const reviewPath = path.join(REVIEW_DIR, `${taskId}.review.md`);
    return { fileName, runningPath, lockPath, markdown, fields, body,
             planPath, testPlanPath, buildPath, testRunPath, reviewPath, taskId };
  }
  return null;
}

// ─── LLM call ──────────────────────────────────────────────────────────────

function buildReviewPrompt(task, artifacts) {
  return `[Plan Reminder]
Request title  : ${task.fields.title}
Your role      : Review & Optimization Agent
Your step      : reviewing
Allowed output : ONLY valid JSON with keys { "verdict", "reasoning", "suggestions" }
Valid verdicts : pass | plan_issue | code_issue | test_issue | critical

Evaluate whether the implementation adequately satisfies the original request.
Be strict: a "pass" means the task is fully done and tests confirm it.

=== TASK REQUEST ===
${task.body.trim()}

=== PLAN (plan.md) ===
${artifacts.plan}

=== TEST PLAN (test-plan.md) ===
${artifacts.testPlan}

=== BUILD RESULT (build.md) ===
${artifacts.build}

=== TEST RUN (test-run.md) ===
${artifacts.testRun}

Respond ONLY with a JSON object. No prose before or after:
{
  "verdict": "pass",
  "reasoning": "...",
  "suggestions": ["..."]
}`;
}

async function callReviewModel(task, artifacts) {
  const apiKey = readEnvVar("LITELLM_MASTER_KEY");
  if (!apiKey) throw new Error("LITELLM_MASTER_KEY is not available");

  const revision     = task.fields.revision     || "0";
  const retryCount   = task.fields.retry_count  || "0";
  const idempotencyKey = `${task.taskId}-reviewing-r${revision}-${retryCount}`;

  const { statusCode, text } = await postJson("http://litellm:4000/v1/chat/completions", {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-idempotency-key": idempotencyKey,
    },
    body: {
      model: "review-model",
      messages: [
        { role: "system",  content: buildReviewPrompt(task, artifacts) },
        { role: "user",    content: `Return the JSON verdict for task ${task.taskId}: ${task.fields.title}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      metadata: {
        trace_id: task.taskId,
        generation_name: "reviewing",
        agent_role: "Review & Optimization Agent",
        pipeline: task.fields.pipeline,
        pipeline_version: task.fields.pipeline_version,
        revision,
        retry_count: retryCount,
        idempotency_key: idempotencyKey,
      },
    },
  });

  // Budget exceeded — route to error instead of crashing
  if (statusCode === 429) {
    return { budgetExceeded: true, statusCode, text };
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`LiteLLM returned HTTP ${statusCode}: ${text}`);
  }

  const payload = JSON.parse(text);
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LiteLLM response missing choices[0].message.content");

  return { budgetExceeded: false, content };
}

function parseVerdict(content) {
  try {
    // strip markdown code fences if the model wrapped the JSON
    const cleaned = content.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const verdict = String(parsed.verdict || "").toLowerCase();
    if (!VALID_VERDICTS.includes(verdict)) {
      return { verdict: "code_issue", reasoning: `Unknown verdict '${parsed.verdict}'; defaulting to code_issue`, suggestions: [] };
    }
    return {
      verdict,
      reasoning:    String(parsed.reasoning    || ""),
      suggestions:  Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return { verdict: "code_issue", reasoning: "Failed to parse review JSON; defaulting to code_issue", suggestions: [] };
  }
}

// ─── artifact management ────────────────────────────────────────────────────

function readArtifacts(task) {
  return {
    plan:     fs.readFileSync(task.planPath,     "utf8"),
    testPlan: fs.readFileSync(task.testPlanPath, "utf8"),
    build:    fs.readFileSync(task.buildPath,    "utf8"),
    testRun:  fs.readFileSync(task.testRunPath,  "utf8"),
  };
}

function writeReviewArtifact(task, verdict, reasoning, suggestions) {
  const content = `---
task_id: ${task.taskId}
artifact: review
agent_role: Review & Optimization Agent
pipeline: ${task.fields.pipeline}
pipeline_version: ${task.fields.pipeline_version}
revision: ${task.fields.revision || "0"}
source_step: reviewing
verdict: ${verdict}
created_at: ${nowIso()}
---

# Review: ${task.fields.title}

- verdict: **${verdict}**
- plan_ref: ${task.planPath}
- test_plan_ref: ${task.testPlanPath}
- build_ref: ${task.buildPath}
- test_run_ref: ${task.testRunPath}

## Reasoning

${reasoning}

## Suggestions

${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") || "None."}
`;
  fs.writeFileSync(task.reviewPath, content);
}

function archiveArtifacts(taskId, files) {
  const revision = "prev";
  const archiveDir = path.join(AGENT_ROOT, "archive", taskId, revision);
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const fp of files) {
    if (fp && fs.existsSync(fp)) {
      fs.renameSync(fp, path.join(archiveDir, path.basename(fp)));
    }
  }
}

function moveArtifactsToDone(task, artifacts) {
  const destDir = path.join(DONE_DIR, task.taskId);
  fs.mkdirSync(destDir, { recursive: true });
  const filesToMove = [
    task.runningPath,
    task.planPath,
    task.testPlanPath,
    task.buildPath,
    task.testRunPath,
    task.reviewPath,
  ];
  for (const fp of filesToMove) {
    if (fp && fs.existsSync(fp)) {
      fs.renameSync(fp, path.join(destDir, path.basename(fp)));
    }
  }
}

function routeToError(task, reason) {
  const fields = { ...task.fields };
  fields.status = "error";
  fields.current_step = "error";
  fields.blocked_by = "Review & Optimization Agent";
  const text = stringifyFrontmatter(
    fields,
    `${task.body}\n\n## Review & Optimization Agent Error\n\n- Time: ${nowIso()}\n- Reason: ${reason}\n`,
  );
  fs.writeFileSync(path.join(ERROR_DIR, task.fileName), text);
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
}

function advanceTask(task, newStep, extraFields) {
  Object.assign(task.fields, { current_step: newStep, status: "running", ...extraFields });
  fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
  fs.rmSync(task.lockPath);
}

// ─── main routing ───────────────────────────────────────────────────────────

const task = selectTask();
if (!task) return [{ json: { status: "NO_TASK" } }];

const artifacts = readArtifacts(task);

let llmResult;
try {
  llmResult = await callReviewModel(task, artifacts);
} catch (error) {
  routeToError(task, String(error.message || error));
  return [{ json: { status: "ERROR_ROUTED", task_id: task.taskId, error: String(error.message) } }];
}

// ─── 429 budget exceeded ────────────────────────────────────────────────────
if (llmResult.budgetExceeded) {
  routeToError(task, `budget_exceeded: LiteLLM returned HTTP ${llmResult.statusCode}`);
  return [{ json: { status: "BUDGET_EXCEEDED", task_id: task.taskId } }];
}

// ─── parse and write review artifact ────────────────────────────────────────
const { verdict, reasoning, suggestions } = parseVerdict(llmResult.content);
writeReviewArtifact(task, verdict, reasoning, suggestions);

const revision  = Number(task.fields.revision    || "0");
const maxRetry  = Number(task.fields.max_retry   || "3");

switch (verdict) {
  case "pass": {
    moveArtifactsToDone(task, artifacts);
    return [{ json: { status: "DONE", task_id: task.taskId, verdict } }];
  }

  case "plan_issue": {
    if (revision + 1 >= maxRetry) {
      routeToError(task, `plan_issue: revision limit reached (${revision}/${maxRetry})`);
      return [{ json: { status: "ERROR_ROUTED", task_id: task.taskId, verdict } }];
    }
    archiveArtifacts(task.taskId, [task.planPath, task.testPlanPath, task.buildPath, task.testRunPath, task.reviewPath]);
    advanceTask(task, "planning", { revision: String(revision + 1), blocked_by: "plan_issue" });
    return [{ json: { status: "REROUTED", task_id: task.taskId, next_step: "planning", verdict } }];
  }

  case "code_issue": {
    if (revision + 1 >= maxRetry) {
      routeToError(task, `code_issue: revision limit reached (${revision}/${maxRetry})`);
      return [{ json: { status: "ERROR_ROUTED", task_id: task.taskId, verdict } }];
    }
    archiveArtifacts(task.taskId, [task.buildPath, task.testRunPath, task.reviewPath]);
    advanceTask(task, "coding", { revision: String(revision + 1), blocked_by: "code_issue" });
    return [{ json: { status: "REROUTED", task_id: task.taskId, next_step: "coding", verdict } }];
  }

  case "test_issue": {
    if (revision + 1 >= maxRetry) {
      routeToError(task, `test_issue: revision limit reached (${revision}/${maxRetry})`);
      return [{ json: { status: "ERROR_ROUTED", task_id: task.taskId, verdict } }];
    }
    archiveArtifacts(task.taskId, [task.testPlanPath, task.buildPath, task.testRunPath, task.reviewPath]);
    advanceTask(task, "test_planning", { revision: String(revision + 1), blocked_by: "test_issue" });
    return [{ json: { status: "REROUTED", task_id: task.taskId, next_step: "test_planning", verdict } }];
  }

  case "critical":
  default: {
    routeToError(task, `critical verdict from Review & Optimization Agent: ${reasoning.slice(0, 120)}`);
    return [{ json: { status: "ERROR_ROUTED", task_id: task.taskId, verdict } }];
  }
}
