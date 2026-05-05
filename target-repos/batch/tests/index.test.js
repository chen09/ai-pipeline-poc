const assert = require("node:assert/strict");
const test = require("node:test");

const { getBatchHealth } = require("../src/index");

test("returns batch health payload", () => {
  assert.deepEqual(getBatchHealth(), {
    service: "batch",
    status: "ok",
  });
});
