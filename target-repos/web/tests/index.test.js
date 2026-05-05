const assert = require("node:assert/strict");
const test = require("node:test");

const { renderVersionLabel } = require("../src/index");

test("renders a stable api version label", () => {
  assert.equal(renderVersionLabel({ version: "0.1.0" }), "API version: 0.1.0");
});

test("rejects missing version view model", () => {
  assert.throws(() => renderVersionLabel({}), /version view model is required/);
});
