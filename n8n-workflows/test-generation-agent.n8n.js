const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { URL } = require("url");

const AGENT_ROOT = "/files/agent";
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const PLAN_DIR = path.join(AGENT_ROOT, "plan");
const TEST_DIR = path.join(AGENT_ROOT, "test");
const ERROR_DIR = path.join(AGENT_ROOT, "error");
const LOCK_TTL_SECONDS = 600;

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
      if (trimmed.slice(0, sep) === name) return trimmed.slice(sep + 1);
    }
  }
  return "";
}

function postJson(url, { headers = {}, body }) {
  const parsed = new URL(url);
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = http.request(
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
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          resolve({ statusCode: response.statusCode || 0, text });
        });
      },
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
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

    try {
      const markdown = fs.readFileSync(runningPath, "utf8");
      const { fields, body } = parseFrontmatter(markdown);
      const taskId = requireField(fields, "task_id");
      const testPlanPath = path.join(TEST_DIR, `${taskId}.test-plan.md`);
      const planPath = path.join(PLAN_DIR, `${taskId}.plan.md`);

      if (fields.current_step !== "test_planning") {
        fs.rmSync(lockPath);
        continue;
      }
      if (fs.existsSync(testPlanPath)) {
        fs.rmSync(lockPath);
        continue;
      }
      if (!fs.existsSync(planPath)) {
        throw new Error(`Missing plan artifact: ${planPath}`);
      }

      return { fileName, runningPath, lockPath, markdown, fields, body, planPath, testPlanPath };
    } catch (error) {
      if (fs.existsSync(lockPath)) fs.rmSync(lockPath);
      throw error;
    }
  }
  return null;
}

function routeToError(task, error) {
  const { fields, body } = parseFrontmatter(task.markdown);
  fields.status = "error";
  fields.current_step = "error";
  fields.blocked_by = "Test Generation Agent";
  const failed = stringifyFrontmatter(
    fields,
    `${body}\n\n## Test Generation Agent Error\n\n- Time: ${nowIso()}\n- Error: ${String(error.message || error)}\n`,
  );
  fs.writeFileSync(path.join(ERROR_DIR, task.fileName), failed);
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
}

function buildPrompt({ fields, body, planText }) {
  return `[Plan Reminder]
Request summary : ${fields.title}
Current plan    : ${planText}
Your role       : Test Generation Agent
Your step       : test_planning
Allowed outputs : exactly one test-plan artifact in markdown.
Do NOT implement code. Do NOT review.

Generate fail-to-pass acceptance test cases and execution checklist for the Implementation Agent.
You must include:
1. Primary acceptance tests
2. Edge cases and regression checks
3. Observable pass criteria
4. Test execution notes

Task body:
${body}`;
}

async function generateTestPlan(task) {
  const apiKey = readEnvVar("LITELLM_MASTER_KEY");
  if (!apiKey) throw new Error("LITELLM_MASTER_KEY is not available in n8n runtime");

  const planText = fs.readFileSync(task.planPath, "utf8");
  const taskId = task.fields.task_id;
  const revision = task.fields.revision || "0";
  const retryCount = task.fields.retry_count || "0";
  const idempotencyKey = `${taskId}-test_planning-r${revision}-${retryCount}`;

  const { statusCode, text } = await postJson("http://litellm:4000/v1/chat/completions", {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-idempotency-key": idempotencyKey,
    },
    body: {
      model: "plan-model",
      messages: [
        {
          role: "system",
          content: buildPrompt({ fields: task.fields, body: task.body, planText }),
        },
        {
          role: "user",
          content: `Create test-plan artifact for task ${taskId}: ${task.fields.title}`,
        },
      ],
      metadata: {
        trace_id: taskId,
        generation_name: "test_planning",
        agent_role: "Test Generation Agent",
        pipeline: task.fields.pipeline,
        pipeline_version: task.fields.pipeline_version,
        revision,
        retry_count: retryCount,
        idempotency_key: idempotencyKey,
      },
    },
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`LiteLLM returned HTTP ${statusCode}: ${text}`);
  }
  const payload = JSON.parse(text);
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LiteLLM response did not include choices[0].message.content");
  return content;
}

function writeArtifactAndAdvance(task, content) {
  const artifact = `---
task_id: ${task.fields.task_id}
artifact: test-plan
agent_role: Test Generation Agent
pipeline: ${task.fields.pipeline}
pipeline_version: ${task.fields.pipeline_version}
revision: ${task.fields.revision || "0"}
source_step: test_planning
created_at: ${nowIso()}
---

# Test Plan: ${task.fields.title}

${content.trim()}
`;
  fs.writeFileSync(task.testPlanPath, artifact);

  task.fields.status = "running";
  task.fields.current_step = "coding";
  fs.writeFileSync(task.runningPath, stringifyFrontmatter(task.fields, task.body));
  fs.rmSync(task.lockPath);
}

const task = selectTask();
if (!task) {
  return [{ json: { status: "NO_TASK" } }];
}

try {
  const content = await generateTestPlan(task);
  writeArtifactAndAdvance(task, content);
  return [{ json: { status: "TEST_PLAN_CREATED", task_id: task.fields.task_id, path: task.testPlanPath } }];
} catch (error) {
  routeToError(task, error);
  return [{ json: { status: "ERROR_ROUTED", task_id: task.fields.task_id, error: String(error.message || error) } }];
}
