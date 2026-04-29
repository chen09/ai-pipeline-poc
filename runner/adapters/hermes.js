"use strict";

async function run(_request, _paths, _logger) {
  return {
    state: "failed",
    summary: "Hermes adapter is not implemented yet",
    changed_files: [],
    exit_code: 3,
    error_message: "not implemented",
    details: {
      adapter: "hermes",
      reason: "phase_6e_stub",
    },
  };
}

module.exports = { run };
