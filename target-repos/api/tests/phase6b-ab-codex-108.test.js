const request = require("supertest");
const { app } = require("../src/index");

describe("GET /phase6b-ab-codex-108", () => {
  it("returns 200 and codex ok payload", async () => {
    const response = await request(app).get("/phase6b-ab-codex-108");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "codex", status: "ok" });
  });
});
