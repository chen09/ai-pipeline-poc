const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { URL } = require("url");

const AGENT_ROOT = "/files/agent";
const INBOX_DIR = path.join(AGENT_ROOT, "inbox");
const RUNNING_DIR = path.join(AGENT_ROOT, "running");
const PLAN_DIR = path.join(AGENT_ROOT, "plan");
const ERROR_DIR = path.join(AGENT_ROOT, "error");
const LOCK_TTL_SECONDS = 600;

function nowIso() {
  return new Date().toISOString();
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    throw new Error("Task is missing YAML frontmatter");
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("Task frontmatter is not closed with ---");
  }

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
    ...orderedKeys.filter((key) => fields[key] !== undefined),
    ...Object.keys(fields).filter((key) => !orderedKeys.includes(key)),
  ];

  return `---\n${keys.map((key) => `${key}: ${fields[key]}`).join("\n")}\n---\n\n${body.trimStart()}`;
}

function requireField(fields, key) {
  if (!fields[key]) throw new Error(`Missing required frontmatter field: ${key}`);
  return fields[key];
}

function claimNextTask() {
  const names = fs.readdirSync(INBOX_DIR).filter((name) => name.endsWith(".md")).sort();

  for (const fileName of names) {
    const sourcePath = path.join(INBOX_DIR, fileName);
    const runningPath = path.join(RUNNING_DIR, fileName);
    const lockPath = `${runningPath}.lock`;

    try {
      fs.renameSync(sourcePath, runningPath);
      fs.writeFileSync(lockPath, `${os.hostname()}|${nowIso()}|${LOCK_TTL_SECONDS}\n`, {
        flag: "wx",
      });
      return { fileName, sourcePath, runningPath, lockPath };
    } catch {
      continue;
    }
  }

  return null;
}

function writeErrorAndRoute(task, originalMarkdown, error) {
  let routedMarkdown;
  try {
    const { fields, body } = parseFrontmatter(originalMarkdown);
    fields.status = "error";
    fields.current_step = "error";
    fields.blocked_by = "Planning Agent";
    routedMarkdown = stringifyFrontmatter(
      fields,
      `${body}\n\n## Planning Agent Error\n\n- Time: ${nowIso()}\n- Error: ${String(error.message || error)}\n`,
    );
  } catch {
    routedMarkdown = `${originalMarkdown || ""}\n\n## Planning Agent Error\n\n- Time: ${nowIso()}\n- Error: ${String(error.message || error)}\n`;
  }

  fs.writeFileSync(path.join(ERROR_DIR, task.fileName), routedMarkdown);
  if (fs.existsSync(task.runningPath)) fs.rmSync(task.runningPath);
  if (fs.existsSync(task.lockPath)) fs.rmSync(task.lockPath);
  return { status: "ERROR_ROUTED", fileName: task.fileName, error: String(error.message || error) };
}

function buildSystemPrompt({ fields, body }) {
  return `[Plan Reminder]
Request summary : ${fields.title}
Current plan    : none yet; you are generating the first plan artifact.
Your role       : Planning Agent
Your step       : planning
Allowed outputs : exactly one planning artifact in markdown.
Do NOT write implementation code. Do NOT generate tests. Do NOT review.

You are the Planning Agent for a local-first multi-agent software engineering pipeline.
Produce a concise, executable implementation plan for downstream agents.
The plan must include:
1. Assumptions and clarifications
2. Implementation steps
3. Test generation guidance for the Test Generation Agent
4. Risks and rollback notes

The task body is:
${body}`;
}

async function callLiteLLM({ fields, body }) {
  const apiKey = readEnvVar("LITELLM_MASTER_KEY");
  if (!apiKey) throw new Error("LITELLM_MASTER_KEY is not available in n8n");

  const taskId = requireField(fields, "task_id");
  const revision = fields.revision || "0";
  const retryCount = fields.retry_count || "0";
  const idempotencyKey = `${taskId}-planning-r${revision}-${retryCount}`;

  const { statusCode, text } = await postJson("http://litellm:4000/v1/chat/completions", {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-idempotency-key": idempotencyKey,
    },
    body: {
      model: "plan-model",
      messages: [
        { role: "system", content: buildSystemPrompt({ fields, body }) },
        { role: "user", content: `Create the planning artifact for task ${taskId}: ${fields.title}` },
      ],
      metadata: {
        trace_id: taskId,
        generation_name: "planning",
        agent_role: "Planning Agent",
        pipeline: fields.pipeline,
        pipeline_version: fields.pipeline_version,
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

function writePlanArtifact({ fields, planContent }) {
  const taskId = requireField(fields, "task_id");
  const revision = fields.revision || "0";
  const planPath = path.join(PLAN_DIR, `${taskId}.plan.md`);

  if (fs.existsSync(planPath)) {
    throw new Error(`Refusing to overwrite existing plan artifact: ${planPath}`);
  }

  fs.writeFileSync(
    planPath,
    `---\ntask_id: ${taskId}\nartifact: plan\nagent_role: Planning Agent\npipeline: ${fields.pipeline}\npipeline_version: ${fields.pipeline_version}\nrevision: ${revision}\nsource_step: planning\ncreated_at: ${nowIso()}\n---\n\n# Plan: ${fields.title}\n\n${planContent.trim()}\n`,
  );
  return planPath;
}

const task = claimNextTask();
if (!task) {
  return [{ json: { status: "NO_TASK" } }];
}

let markdown = "";
try {
  markdown = fs.readFileSync(task.runningPath, "utf8");
  const { fields, body } = parseFrontmatter(markdown);

  requireField(fields, "task_id");
  requireField(fields, "title");

  if (fields.pipeline !== "code-default" || fields.pipeline_version !== "v0.1") {
    throw new Error(`Unsupported pipeline contract: ${fields.pipeline}/${fields.pipeline_version}`);
  }
  if (fields.current_step !== "planning") {
    throw new Error(`Expected current_step=planning, got ${fields.current_step}`);
  }

  const planContent = await callLiteLLM({ fields, body });
  const planPath = writePlanArtifact({ fields, planContent });

  fields.status = "running";
  fields.current_step = "test_planning";
  fs.writeFileSync(task.runningPath, stringifyFrontmatter(fields, body));
  fs.rmSync(task.lockPath);

  return [{ json: { status: "PLANNED", task_id: fields.task_id, plan_path: planPath } }];
} catch (error) {
  return [{ json: writeErrorAndRoute(task, markdown, error) }];
}
