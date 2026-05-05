const ROUTE = {
  ROOT: "root",
  HEALTH: "health",
  VERSION: "version",
  HOT_RELOAD_VERSION: "hot-reload-version",
  HOT_RELOAD_SLOW: "hot-reload-slow",
  CURSOR_SMOKE_013: "cursor-smoke-013",
  CURSOR_SMOKE_014: "cursor-smoke-014",
  CURSOR_SMOKE: "cursor-smoke",
  CURSOR_SMOKE_002: "cursor-smoke-002",
  CURSOR_SMOKE_003: "cursor-smoke-003",
  CURSOR_SMOKE_004: "cursor-smoke-004",
  CURSOR_SMOKE_005: "cursor-smoke-005",
  CURSOR_SMOKE_006: "cursor-smoke-006",
  CURSOR_SMOKE_009: "cursor-smoke-009",
  CURSOR_SMOKE_010: "cursor-smoke-010",
  CURSOR_SMOKE_011: "cursor-smoke-011",
  CURSOR_SMOKE_012: "cursor-smoke-012",
  CURSOR_SMOKE_015: "cursor-smoke-015",
  PHASE6A_STATUS: "phase6a-status",
  PHASE6B_AB_CODEX_102: "phase6b-ab-codex-102",
  PHASE6B_AB_CODEX_103: "phase6b-ab-codex-103",
  PHASE6B_AB_CODEX_104: "phase6b-ab-codex-104",
  PHASE6B_AB_CODEX_105: "phase6b-ab-codex-105",
  PHASE6B_AB_CODEX_106: "phase6b-ab-codex-106",
  PHASE6B_AB_CODEX_107: "phase6b-ab-codex-107",
  PHASE6B_AB_CODEX_108: "phase6b-ab-codex-108",
  PHASE6B_AB_CURSOR_102: "phase6b-ab-cursor-102",
  PHASE6B_AB_CURSOR_103: "phase6b-ab-cursor-103",
  PHASE6B_AB_CURSOR_104: "phase6b-ab-cursor-104",
  PHASE6B_AB_CURSOR_105: "phase6b-ab-cursor-105",
  PHASE6B_AB_CURSOR_106: "phase6b-ab-cursor-106",
  PHASE6B_AB_CURSOR_107: "phase6b-ab-cursor-107",
  PHASE6B_AB_CURSOR_108: "phase6b-ab-cursor-108",
  API_V1_TIME_REVERSE_POST: "api-v1-time-reverse-post",
  API_V1_TIME_REVERSE_GET: "api-v1-time-reverse-get",
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Record<string, unknown>} body
 * @param {number} [code]
 */
function json(req, res, body, code = 200) {
  res.status(code).setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({ ...body, request_id: req.requestId });
}

/**
 * @param {string} handlerLabel
 * @param {number} handlerVersionNum
 */
function makeHandlerMap(handlerLabel, handlerVersionNum) {
  return {
    [ROUTE.HOT_RELOAD_VERSION]: (req, res) => {
      json(req, res, { handler: handlerLabel, version: handlerVersionNum });
    },
    [ROUTE.HOT_RELOAD_SLOW]: async (req, res) => {
      await new Promise((r) => setTimeout(r, 100));
      json(req, res, { handler: handlerLabel, slow: true });
    },
    [ROUTE.ROOT]: (req, res) => {
      json(req, res, { service: "api", status: "booted" });
    },
    [ROUTE.HEALTH]: (req, res) => {
      json(req, res, { status: "ok" });
    },
    [ROUTE.VERSION]: (req, res) => {
      json(req, res, { version: "0.1.0" });
    },
    [ROUTE.CURSOR_SMOKE_013]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_014]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_002]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_003]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_004]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_005]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_006]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_009]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_010]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_011]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_012]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.CURSOR_SMOKE_015]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6A_STATUS]: (req, res) => {
      json(req, res, { phase: "6A", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_102]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_103]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_104]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_105]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_106]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_107]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CODEX_108]: (req, res) => {
      json(req, res, { backend: "codex", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_102]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_103]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_104]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_105]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_106]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_107]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.PHASE6B_AB_CURSOR_108]: (req, res) => {
      json(req, res, { backend: "cursor", status: "ok" });
    },
    [ROUTE.API_V1_TIME_REVERSE_POST]: (req, res) => {
      json(req, res, {
        error: "infeasible",
        code: "TIME_REVERSAL_INFEASIBLE",
        message:
          "Reversing real-world time by any amount is physically impossible. " +
          "No known technology, algorithm, or physical mechanism can alter the flow of time. " +
          "This is not a pipeline or implementation limitation — it is a fundamental constraint of physics.",
        physics: {
          causality:
            "Reversing time violates causal locality (effect precedes cause).",
          thermodynamics:
            "Entropy strictly increases in closed systems; time reversal requires entropy decrease.",
          relativity:
            "Time dilation is relative (clocks tick slower near mass/velocity) but always forward for all observers.",
        },
        suggestion:
          "If a time-shift simulation is needed for testing, consider mocking a time service " +
          "(e.g., via NTP offset or timezone adjustment) with explicit documentation that it is a simulation, not real time travel.",
      }, 422);
    },
    [ROUTE.API_V1_TIME_REVERSE_GET]: (req, res) => {
      json(req, res, {
        error: "infeasible",
        code: "TIME_REVERSAL_INFEASIBLE",
        message:
          "POST /api/v1/time/reverse is the only supported method. " +
          "However, this operation is physically infeasible — real-world time cannot be reversed.",
        physics: {
          causality: "Violated by any attempt to reverse time.",
          thermodynamics: "Entropy never decreases in isolated systems.",
          relativity:
            "Time always advances; relativistic time dilation slows but never reverses.",
        },
      }, 422);
    },
  };
}

function getHandlerMap() {
  return makeHandlerMap("v1", 1);
}

module.exports = {
  ROUTE,
  makeHandlerMap,
  getHandlerMap,
};
