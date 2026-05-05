const assert = require("node:assert/strict");
const test = require("node:test");

const { adaptApiVersion } = require("../src/index");

test("adapts api version payload for clients", () => {
  assert.deepEqual(adaptApiVersion({ version: "0.1.0" }), {
    source: "api",
    version: "0.1.0",
  });
});

test("rejects missing version payload", () => {
  assert.throws(() => adaptApiVersion({}), /api version payload is required/);
});
