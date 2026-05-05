const crypto = require("crypto");
const express = require("express");
const { HandlerRegistry } = require("./hot-reload/registry");
const { HotReloadManager } = require("./hot-reload/manager");
const {
  getHandlerMap: getHandlerMapV1,
  ROUTE,
} = require("./hot-reload/handlers-v1");
const { getHandlerMap: getHandlerMapV2 } = require("./hot-reload/handlers-v2");

const registry = new HandlerRegistry();
const manager = new HotReloadManager(registry);

const app = express();

app.use((req, res, next) => {
  const id =
    req.headers["x-request-id"] ||
    (typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.use(express.json());

manager.registerVersion("v1", getHandlerMapV1());
manager.registerVersion("v2", getHandlerMapV2());
registry.setVersion("v1");

function dispatch(route) {
  return (req, res, next) => {
    manager.dispatch(route, req, res, next);
  };
}

app.get("/", dispatch(ROUTE.ROOT));
app.get("/health", dispatch(ROUTE.HEALTH));
app.get("/version", dispatch(ROUTE.VERSION));

app.get("/cursor-smoke-013", dispatch(ROUTE.CURSOR_SMOKE_013));
app.get("/cursor-smoke-014", dispatch(ROUTE.CURSOR_SMOKE_014));
app.get("/cursor-smoke", dispatch(ROUTE.CURSOR_SMOKE));
app.get("/cursor-smoke-002", dispatch(ROUTE.CURSOR_SMOKE_002));
app.get("/cursor-smoke-003", dispatch(ROUTE.CURSOR_SMOKE_003));
app.get("/cursor-smoke-004", dispatch(ROUTE.CURSOR_SMOKE_004));
app.get("/cursor-smoke-005", dispatch(ROUTE.CURSOR_SMOKE_005));
app.get("/cursor-smoke-006", dispatch(ROUTE.CURSOR_SMOKE_006));
app.get("/cursor-smoke-009", dispatch(ROUTE.CURSOR_SMOKE_009));
app.get("/cursor-smoke-010", dispatch(ROUTE.CURSOR_SMOKE_010));
app.get("/cursor-smoke-011", dispatch(ROUTE.CURSOR_SMOKE_011));
app.get("/cursor-smoke-012", dispatch(ROUTE.CURSOR_SMOKE_012));
app.get("/cursor-smoke-015", dispatch(ROUTE.CURSOR_SMOKE_015));

app.get("/phase6a/status", dispatch(ROUTE.PHASE6A_STATUS));

app.get("/phase6b-ab-codex-102", dispatch(ROUTE.PHASE6B_AB_CODEX_102));
app.get("/phase6b-ab-codex-103", dispatch(ROUTE.PHASE6B_AB_CODEX_103));
app.get("/phase6b-ab-codex-104", dispatch(ROUTE.PHASE6B_AB_CODEX_104));
app.get("/phase6b-ab-codex-105", dispatch(ROUTE.PHASE6B_AB_CODEX_105));
app.get("/phase6b-ab-codex-106", dispatch(ROUTE.PHASE6B_AB_CODEX_106));
app.get("/phase6b-ab-codex-107", dispatch(ROUTE.PHASE6B_AB_CODEX_107));
app.get("/phase6b-ab-codex-108", dispatch(ROUTE.PHASE6B_AB_CODEX_108));

app.get("/phase6b-ab-cursor-102", dispatch(ROUTE.PHASE6B_AB_CURSOR_102));
app.get("/phase6b-ab-cursor-103", dispatch(ROUTE.PHASE6B_AB_CURSOR_103));
app.get("/phase6b-ab-cursor-104", dispatch(ROUTE.PHASE6B_AB_CURSOR_104));
app.get("/phase6b-ab-cursor-105", dispatch(ROUTE.PHASE6B_AB_CURSOR_105));
app.get("/phase6b-ab-cursor-106", dispatch(ROUTE.PHASE6B_AB_CURSOR_106));
app.get("/phase6b-ab-cursor-107", dispatch(ROUTE.PHASE6B_AB_CURSOR_107));
app.get("/phase6b-ab-cursor-108", dispatch(ROUTE.PHASE6B_AB_CURSOR_108));

app.post("/api/v1/time/reverse", dispatch(ROUTE.API_V1_TIME_REVERSE_POST));
app.get("/api/v1/time/reverse", dispatch(ROUTE.API_V1_TIME_REVERSE_GET));

app.get("/hot-reload/version", dispatch(ROUTE.HOT_RELOAD_VERSION));
app.get("/hot-reload/slow", dispatch(ROUTE.HOT_RELOAD_SLOW));

app.post("/admin/reload", async (req, res, next) => {
  try {
    const from = registry.getCurrentVersion();
    const to = req.body && req.body.version;
    if (to !== "v1" && to !== "v2") {
      res.status(400).setHeader("Content-Type", "application/json; charset=utf-8");
      return res.json({
        error: "invalid_version",
        request_id: req.requestId,
      });
    }
    await manager.setVersion(to);
    res.status(200).setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({
      status: "reloading",
      from,
      to,
      started_at: new Date().toISOString(),
      request_id: req.requestId,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/reload/status", (req, res) => {
  const snap = manager.getStatusSnapshot();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({ ...snap, request_id: req.requestId });
});

function testReset() {
  manager.forceReset("v1");
}

module.exports = { app, testReset, registry, manager };

if (require.main === module) {
  process.on("SIGHUP", () => {
    const cur = registry.getCurrentVersion();
    const next = cur === "v1" ? "v2" : "v1";
    void manager.setVersion(next).catch(() => {});
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}
