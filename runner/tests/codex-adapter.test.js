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
    assert.match(prompt, /PLAN_CONTENT: add endpoint/);
    assert.match(prompt, /TEST_PLAN_CONTENT: add test/);
    assert.match(prompt, new RegExp(paths.targetRepoAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(prompt, /IMPLEMENTATION_RESULT:T-CODEX-001/);
    assert.ok(events.some((item) => item.event === "codex_exec_start"));
  } finally {
    if (previousExecutable === undefined) delete process.env.CODEX_EXECUTABLE;
    else process.env.CODEX_EXECUTABLE = previousExecutable;
    if (previousSandbox === undefined) delete process.env.CODEX_SANDBOX;
    else process.env.CODEX_SANDBOX = previousSandbox;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
