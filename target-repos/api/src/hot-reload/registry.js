/**
 * Versioned handler registry with optional fallback to v1.
 *
 * Known limitation: Node.js module cache (`require`) prevents true memory unload
 * of code from previous versions; dispatch only switches which in-memory functions run.
 */
class HandlerRegistry {
  constructor() {
    /** @type {Record<string, Record<string, Function>>} */
    this.handlers = Object.create(null);
    /** @type {string | null} */
    this.currentVersion = null;
  }

  /**
   * @param {string} version
   * @param {Record<string, Function>} handlerMap
   */
  registerVersion(version, handlerMap) {
    this.handlers[version] = { ...handlerMap };
  }

  /**
   * @param {string} version
   */
  setVersion(version) {
    if (!this.handlers[version]) {
      throw new Error(`Unknown version: ${version}`);
    }
    this.currentVersion = version;
  }

  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * @param {string} routeName
   * @returns {Function | null}
   */
  getHandler(routeName) {
    const v = this.currentVersion;
    return this.getHandlerForVersion(v, routeName);
  }

  /**
   * @param {string | null | undefined} version
   * @param {string} routeName
   * @returns {Function | null}
   */
  getHandlerForVersion(version, routeName) {
    if (!version) return null;
    const primary = this.handlers[version];
    if (primary && typeof primary[routeName] === "function") {
      return primary[routeName];
    }
    const fallback = this.handlers.v1;
    if (fallback && typeof fallback[routeName] === "function") {
      return fallback[routeName];
    }
    return null;
  }

  getRegisteredVersions() {
    return Object.keys(this.handlers);
  }
}

module.exports = { HandlerRegistry };
