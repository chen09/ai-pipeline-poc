const request = require("supertest");
const { app } = require("../src/index");

describe("GET /cursor-smoke-015", () => {
  it("returns 200 and cursor ok payload", async () => {
    const response = await request(app).get("/cursor-smoke-015");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "cursor", status: "ok" });
  });
});
