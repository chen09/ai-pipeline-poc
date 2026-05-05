"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { run } = require("../adapters/codex");

test("codex adapter invokes CLI and parses completion artifact", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-adapter-"));
  const previousExecutable = process.env.CODEX_EXECUTABLE;
  const previousSandbox = process.env.CODEX_SANDBOX;
  const previousPlanMaxChars = process.env.CODEX_PLAN_MAX_CHARS;
  const previousTestPlanMaxChars = process.env.CODEX_TEST_PLAN_MAX_CHARS;
  const previousTimeoutBufferSeconds = process.env.CODEX_TIMEOUT_BUFFER_SECONDS;

  try {
    const projectRoot = tempRoot;
    const jobsDir = path.join(projectRoot, "agent", "jobs");
    const targetRepoAbs = path.join(projectRoot, "target-repos", "api");
    fs.mkdirSync(jobsDir, { recursive: true });
    fs.mkdirSync(targetRepoAbs, { recursive: true });

    const planAbs = path.join(projectRoot, "agent", "plan", "task.plan.md");
    const testPlanAbs = path.join(projectRoot, "agent", "test", "task.test-plan.md");
    fs.mkdirSync(path.dirname(planAbs), { recursive: true });
    fs.mkdirSync(path.dirname(testPlanAbs), { recursive: true });
    fs.writeFileSync(planAbs, "PLAN_CONTENT: add endpoint\n", "utf8");
    fs.writeFileSync(testPlanAbs, "TEST_PLAN_CONTENT: add test\n", "utf8");

    const fakeCodexPath = path.join(projectRoot, "fake-codex");
    const capturedPromptPath = path.join(projectRoot, "captured-prompt.txt");
    const fakeCodexScript = `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--output-last-message");
if (outIdx === -1 || !args[outIdx + 1]) process.exit(2);
const outputPath = args[outIdx + 1];
const stdin = fs.readFileSync(0, "utf8");
fs.writeFileSync(${JSON.stringify(capturedPromptPath)}, stdin, "utf8");
const payload = {
  task_id: "T-CODEX-001",
  success: true,
  summary: "fake codex success",
  blocker: "none",
  changed_files: ["target-repos/api/src/index.js"],
  commands: ["npm test"],
  tests: "pass",
  error: ""
};
fs.mkdirSync(require("path").dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload), "utf8");
`;
    fs.writeFileSync(fakeCodexPath, fakeCodexScript, { mode: 0o755 });

    process.env.CODEX_EXECUTABLE = fakeCodexPath;
    process.env.CODEX_SANDBOX = "workspace-write";
    process.env.CODEX_PLAN_MAX_CHARS = "8";
    process.env.CODEX_TEST_PLAN_MAX_CHARS = "8";
    process.env.CODEX_TIMEOUT_BUFFER_SECONDS = "5";

    const requestPayload = {
      task_id: "T-CODEX-001",
      target_repo: "target-repos/api",
      task_brief: "TASK_BRIEF: implement feature X",
      timeout_seconds: 30,
    };
    const paths = {
      projectRoot,
      planAbs,
      testPlanAbs,
      targetRepoAbs,
    };
    const events = [];
    const logger = {
      info: (event, data) => events.push({ level: "info", event, data }),
      warn: (event, data) => events.push({ level: "warn", event, data }),
      error: (event, data) => events.push({ level: "error", event, data }),
    };

    const result = await run(requestPayload, paths, logger);
    assert.equal(result.state, "completed");
    assert.deepEqual(result.changed_files, ["target-repos/api/src/index.js"]);

    const prompt = fs.readFileSync(capturedPromptPath, "utf8");
    assert.match(prompt, /TASK_BRIEF: implement feature X/);
    assert.match(prompt, /\[truncated to 8 chars via CODEX_PLAN_MAX_CHARS\]/);
    assert.match(prompt, /\[truncated to 8 chars via CODEX_TEST_PLAN_MAX_CHARS\]/);
    assert.match(prompt, new RegExp(paths.targetRepoAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(prompt, /IMPLEMENTATION_RESULT:T-CODEX-001/);
    const startEvent = events.find((item) => item.event === "codex_exec_start");
    assert.ok(startEvent);
    assert.equal(startEvent.data.timeoutBaseSeconds, 30);
    assert.equal(startEvent.data.timeoutBufferSeconds, 5);
    assert.equal(startEvent.data.timeoutMs, 35000);
  } finally {
    if (previousExecutable === undefined) delete process.env.CODEX_EXECUTABLE;
    else process.env.CODEX_EXECUTABLE = previousExecutable;
    if (previousSandbox === undefined) delete process.env.CODEX_SANDBOX;
    else process.env.CODEX_SANDBOX = previousSandbox;
    if (previousPlanMaxChars === undefined) delete process.env.CODEX_PLAN_MAX_CHARS;
    else process.env.CODEX_PLAN_MAX_CHARS = previousPlanMaxChars;
    if (previousTestPlanMaxChars === undefined) delete process.env.CODEX_TEST_PLAN_MAX_CHARS;
    else process.env.CODEX_TEST_PLAN_MAX_CHARS = previousTestPlanMaxChars;
    if (previousTimeoutBufferSeconds === undefined) delete process.env.CODEX_TIMEOUT_BUFFER_SECONDS;
    else process.env.CODEX_TIMEOUT_BUFFER_SECONDS = previousTimeoutBufferSeconds;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("codex adapter prefers npm CLI symlink under ~/.local/bin", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-adapter-local-bin-"));
  const previousExecutable = process.env.CODEX_EXECUTABLE;
  const previousHome = process.env.HOME;

  try {
    const fakeHome = path.join(tempRoot, "home");
    const localBin = path.join(fakeHome, ".local", "bin");
    fs.mkdirSync(localBin, { recursive: true });

    const fakeCodexPath = path.join(localBin, "codex");
    const fakeCodexScript = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--output-last-message");
if (outIdx === -1 || !args[outIdx + 1]) process.exit(2);
const outputPath = args[outIdx + 1];
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  task_id: "T-CODEX-LOCAL-BIN",
  success: true,
  summary: "local bin codex success",
  blocker: "none",
  changed_files: [],
  commands: [],
  tests: "",
  error: ""
}), "utf8");
`;
    fs.writeFileSync(fakeCodexPath, fakeCodexScript, { mode: 0o755 });

    delete process.env.CODEX_EXECUTABLE;
    process.env.HOME = fakeHome;

    const jobsDir = path.join(tempRoot, "agent", "jobs");
    const targetRepoAbs = path.join(tempRoot, "target-repos", "api");
    const planAbs = path.join(tempRoot, "agent", "plan", "task.plan.md");
    const testPlanAbs = path.join(tempRoot, "agent", "test", "task.test-plan.md");
    fs.mkdirSync(jobsDir, { recursive: true });
    fs.mkdirSync(targetRepoAbs, { recursive: true });
    fs.mkdirSync(path.dirname(planAbs), { recursive: true });
    fs.mkdirSync(path.dirname(testPlanAbs), { recursive: true });
    fs.writeFileSync(planAbs, "plan\n", "utf8");
    fs.writeFileSync(testPlanAbs, "test plan\n", "utf8");

    const events = [];
    const result = await run(
      {
        task_id: "T-CODEX-LOCAL-BIN",
        target_repo: "target-repos/api",
        task_brief: "verify resolver",
        timeout_seconds: 30,
      },
      {
        projectRoot: tempRoot,
        planAbs,
        testPlanAbs,
        targetRepoAbs,
      },
      {
        info: (event, data) => events.push({ event, data }),
        warn: () => {},
        error: () => {},
      },
    );

    assert.equal(result.state, "completed");
    const startEvent = events.find((item) => item.event === "codex_exec_start");
    assert.ok(startEvent);
    assert.equal(startEvent.data.executable, fakeCodexPath);
  } finally {
    if (previousExecutable === undefined) delete process.env.CODEX_EXECUTABLE;
    else process.env.CODEX_EXECUTABLE = previousExecutable;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
