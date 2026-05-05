const request = require("supertest");
const { app } = require("../src/index");

describe("GET /phase6b-ab-cursor-107", () => {
  it("returns backend cursor and status ok", async () => {
    const response = await request(app).get("/phase6b-ab-cursor-107");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ backend: "cursor", status: "ok" });
  });
});
