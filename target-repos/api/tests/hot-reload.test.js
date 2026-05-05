const request = require("supertest");
const { app, testReset } = require("../src/index");

describe("hot reload", () => {
  afterEach(async () => {
    await testReset();
  });

  it("F001: POST /admin/reload switches GET /hot-reload/version", async () => {
    const before = await request(app).get("/hot-reload/version");
    expect(before.status).toBe(200);
    expect(before.body.handler).toBe("v1");
    expect(before.body.version).toBe(1);

    const reload = await request(app)
      .post("/admin/reload")
      .send({ version: "v2" });
    expect(reload.status).toBe(200);
    expect(reload.body.status).toBe("reloading");
    expect(reload.body.to).toBe("v2");
    expect(reload.body.request_id).toBeDefined();

    const after = await request(app).get("/hot-reload/version");
    expect(after.status).toBe(200);
    expect(after.body.handler).toBe("v2");
    expect(after.body.version).toBe(2);
  });

  it("F002: zero-drop — concurrent slow requests survive mid-flight reload", async () => {
    const n = 40;
    const slowReqs = Array.from({ length: n }, () =>
      request(app).get("/hot-reload/slow"),
    );

    await new Promise((r) => setTimeout(r, 25));

    const reloadRes = await request(app)
      .post("/admin/reload")
      .send({ version: "v2" });

    expect(reloadRes.status).toBe(200);

    const slowResponses = await Promise.all(slowReqs);
    for (const r of slowResponses) {
      expect(r.status).toBe(200);
      expect(r.body.slow).toBe(true);
      expect(r.body.request_id).toBeDefined();
    }
  });

  it("E001: reload with no in-flight traffic completes quickly", async () => {
    const t0 = Date.now();
    const res = await request(app)
      .post("/admin/reload")
      .send({ version: "v2" });
    const dt = Date.now() - t0;
    expect(res.status).toBe(200);
    expect(dt).toBeLessThan(1000);
  });

  it("E002: invalid version does not switch active handler", async () => {
    await request(app).post("/admin/reload").send({ version: "v2" });

    const bad = await request(app)
      .post("/admin/reload")
      .send({ version: "v-not-real" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("invalid_version");

    const ver = await request(app).get("/hot-reload/version");
    expect(ver.body.handler).toBe("v2");
  });

  it("F003: slow request keeps the version it entered on", async () => {
    // Start slow request and track it properly
    const slowP = request(app).get("/hot-reload/slow");
    // Superagent sends only after .then/.catch/await; kick off before polling status
    void slowP.then(() => {});

    // Wait for in-flight to be tracked
    let sawInflight = false;
    for (let i = 0; i < 120; i++) {
      const st = await request(app).get("/admin/reload/status");
      const v1n = st.body.inFlight.v1 ?? 0;
      if (v1n >= 1) {
        sawInflight = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(sawInflight).toBe(true);

    // Trigger reload while slow request is in-flight
    await request(app).post("/admin/reload").send({ version: "v2" });

    // Verify current version switched
    const status = await request(app).get("/admin/reload/status");
    expect(status.body.currentVersion).toBe("v2");

    // Properly await the slow request response before test ends
    const slowRes = await slowP;
    expect(slowRes.status).toBe(200);
    expect(slowRes.body.handler).toBe("v1");
    expect(slowRes.body.slow).toBe(true);
  });

  it("E004: rapid sequential reloads settle correctly", async () => {
    await request(app).post("/admin/reload").send({ version: "v2" });
    let r = await request(app).get("/hot-reload/version");
    expect(r.body.handler).toBe("v2");

    await request(app).post("/admin/reload").send({ version: "v1" });
    r = await request(app).get("/hot-reload/version");
    expect(r.body.handler).toBe("v1");

    await request(app).post("/admin/reload").send({ version: "v2" });
    r = await request(app).get("/hot-reload/version");
    expect(r.body.handler).toBe("v2");

    await request(app).post("/admin/reload").send({ version: "v1" });
    r = await request(app).get("/hot-reload/version");
    expect(r.body.handler).toBe("v1");
  });
});
