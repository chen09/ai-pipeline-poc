const request = require("supertest");
const { app } = require("../src/index");

describe("GET /phase6b-ab-cursor-108", () => {
  it("returns backend cursor and status ok", async () => {
    const response = await request(app).get("/phase6b-ab-cursor-108");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "cursor", status: "ok" });
  });
});
