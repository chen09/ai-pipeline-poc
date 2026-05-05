const request = require("supertest");
const { app } = require("../src/index");

describe("GET /phase6b-ab-cursor-102", () => {
  it("returns 200 and cursor ok payload", async () => {
    const response = await request(app).get("/phase6b-ab-cursor-102");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "cursor", status: "ok" });
  });
});
