const request = require("supertest");
const { app } = require("../src/index");

describe("GET /cursor-smoke-014", () => {
  it("returns { backend: 'cursor', status: 'ok' }", async () => {
    const response = await request(app).get("/cursor-smoke-014");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "cursor", status: "ok" });
  });
});
