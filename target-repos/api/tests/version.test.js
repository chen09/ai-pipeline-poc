const request = require("supertest");
const { app } = require("../src/index");

describe("GET /version", () => {
  it("returns version JSON", async () => {
    const response = await request(app).get("/version");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ version: "0.1.0" });
  });
});
