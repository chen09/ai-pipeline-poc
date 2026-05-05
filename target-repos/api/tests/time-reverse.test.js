const request = require("supertest");
const { app } = require("../src/index");

describe("POST /api/v1/time/reverse", () => {
  it("TT-AC-01: returns 422 with TIME_REVERSAL_INFEASIBLE error", async () => {
    const res = await request(app).post("/api/v1/time/reverse");
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("infeasible");
    expect(res.body.code).toBe("TIME_REVERSAL_INFEASIBLE");
    expect(res.body.physics).toBeDefined();
    expect(res.body.physics.causality).toBeDefined();
    expect(res.body.physics.thermodynamics).toBeDefined();
    expect(res.body.physics.relativity).toBeDefined();
    expect(res.body.message).toContain("physically impossible");
  });

  it("TT-AC-01: does NOT fake success (no 200/201 status)", async () => {
    const res = await request(app).post("/api/v1/time/reverse");
    expect(res.status).not.toBeLessThan(200);
    expect(res.status).not.toBeLessThan(400);
    // Must be 4xx error, not success
    expect([200, 201, 204]).not.toContain(res.status);
  });

  it("TT-EC-01: response includes suggestion for simulation", async () => {
    const res = await request(app).post("/api/v1/time/reverse");
    expect(res.body.suggestion).toContain("mock");
  });
});

describe("GET /api/v1/time/reverse", () => {
  it("TT-AC-01: returns 422 with TIME_REVERSAL_INFEASIBLE error", async () => {
    const res = await request(app).get("/api/v1/time/reverse");
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("infeasible");
    expect(res.body.code).toBe("TIME_REVERSAL_INFEASIBLE");
  });

  it("TT-AC-01: mentions POST is the only supported method", async () => {
    const res = await request(app).get("/api/v1/time/reverse");
    expect(res.body.message).toContain("POST");
  });
});
