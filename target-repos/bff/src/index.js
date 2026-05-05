function adaptApiVersion(apiPayload) {
  if (!apiPayload || typeof apiPayload.version !== "string") {
    throw new Error("api version payload is required");
  }

  return {
    source: "api",
    version: apiPayload.version,
  };
}

module.exports = { adaptApiVersion };
