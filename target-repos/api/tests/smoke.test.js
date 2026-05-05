const request = require("supertest");
const { app } = require("../src/index");

describe("API smoke", () => {
  it("returns boot status on /", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      service: "api",
      status: "booted",
    });
  });

  it("returns phase6a status", async () => {
    const response = await request(app).get("/phase6a/status");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ phase: "6A", status: "ok" });
  });
});
