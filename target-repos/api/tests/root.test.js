const request = require("supertest");
const { app } = require("../src/index");

describe("GET / root endpoint", () => {
  /**
   * Test 1.1: Root Endpoint Returns 200 Status
   */
  it("test_root_endpoint_status_200", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
  });

  /**
   * Test 1.2: Root Endpoint Returns Valid JSON
   */
  it("test_root_endpoint_returns_json", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    expect(typeof response.body).toBe("object");
    expect(Array.isArray(response.body)).toBe(false);
  });

  /**
   * Test 1.3: Root Endpoint Contains Expected Stable Keys
   * Verifies key set is deterministic across multiple calls.
   */
  it("test_root_endpoint_has_stable_keys", async () => {
    const response1 = await request(app).get("/");
    const response2 = await request(app).get("/");

    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);

    const keys1 = Object.keys(response1.body);
    const keys2 = Object.keys(response2.body);

    expect(keys1.length).toBeGreaterThan(0);
    expect(keys1).toEqual(keys2);
    expect(keys1).toContain("service");
    expect(keys1).toContain("status");
  });

  /**
   * Test 2.1: Root Endpoint Has No Dynamic Identifiers
   * Verifies that non-documented volatile fields are absent.
   */
  it("test_root_endpoint_no_dynamic_ids", async () => {
    const response1 = await request(app).get("/");
    const response2 = await request(app).get("/");

    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);

    // service and status are documented static keys; values should match
    expect(response1.body.service).toEqual(response2.body.service);
    expect(response1.body.status).toEqual(response2.body.status);

    // volatile fields should not be present
    expect(response1.body).not.toHaveProperty("id");
    expect(response1.body).not.toHaveProperty("timestamp");
    expect(response1.body).not.toHaveProperty("uuid");
  });

  /**
   * Test 2.2: Root Endpoint Does Not Return 5xx
   */
  it("test_root_endpoint_no_5xx", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBeLessThan(500);
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
  });

  /**
   * Test 2.3: Root Endpoint Concurrent Stability
   * Verifies stability under concurrent requests.
   */
  it("test_root_endpoint_concurrent", async () => {
    const promises = Array.from({ length: 10 }, () => request(app).get("/"));
    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });

    const keySets = responses.map((r) => Object.keys(r.body).sort());
    const firstKeys = keySets[0];
    keySets.forEach((keys) => {
      expect(keys).toEqual(firstKeys);
    });
  });
});
