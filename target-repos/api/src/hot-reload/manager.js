/**
 * Hot reload orchestration: in-flight counting per version and post-switch drain.
 *
 * Known limitation: Node.js cannot unload prior module bytecode from `require`;
 * we only gate traffic to alternate handler closures already loaded in-process.
 */
const DRAIN_TIMEOUT_MS = 5000;

class HotReloadManager {
  /**
   * @param {import('./registry').HandlerRegistry} registry
   * @param {{ drainTimeoutMs?: number }} [options]
   */
  constructor(registry, options = {}) {
    this.registry = registry;
    this.drainTimeoutMs =
      options.drainTimeoutMs ?? DRAIN_TIMEOUT_MS;
    /** @type {Map<string, number>} */
    this.inFlight = new Map();
    /** @type {Promise<void>} */
    this._mutex = Promise.resolve();
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    this._drainTimers = new Map();
    /** @type {Map<string, (version: string) => void>} */
    this._drainCallbacks = new Map();
  }

  get DRAIN_TIMEOUT_MS() {
    return this.drainTimeoutMs;
  }

  /**
   * @template T
   * @param {() => T | Promise<T>} fn
   * @returns {Promise<T>}
   */
  _withMutex(fn) {
    const run = this._mutex.then(() => fn());
    this._mutex = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  /**
   * @param {string} version
   * @param {Record<string, Function>} handlerMap
   * @param {{ onDrained?: (version: string) => void }} [meta]
   */
  registerVersion(version, handlerMap, meta = {}) {
    this.registry.registerVersion(version, handlerMap);
    if (!this.inFlight.has(version)) {
      this.inFlight.set(version, 0);
    }
    if (typeof meta.onDrained === "function") {
      this._drainCallbacks.set(version, meta.onDrained);
    }
  }

  /**
   * @param {string} newVersion
   * @returns {Promise<void>}
   */
  async setVersion(newVersion) {
    await this._withMutex(async () => {
      if (!this.inFlight.has(newVersion)) {
        this.inFlight.set(newVersion, 0);
      }

      const oldVersion = this.registry.getCurrentVersion();
      this.registry.setVersion(newVersion);

      if (oldVersion != null && oldVersion !== newVersion) {
        this._startDrainTimer(oldVersion);
      }
    });
  }

  /**
   * Force-reset in-flight counters and version for test isolation.
   * This does NOT wait for pending requests — it clears state and replaces the mutex.
   * @param {string} version
   */
  forceReset(version) {
    for (const key of this.inFlight.keys()) {
      this.inFlight.set(key, 0);
    }
    this._mutex = Promise.resolve();
    this.registry.setVersion(version);
  }

  /**
   * @param {string} oldVersion
   */
  _startDrainTimer(oldVersion) {
    const existing = this._drainTimers.get(oldVersion);
    if (existing) {
      clearTimeout(existing);
    }

    const deadline = Date.now() + this.drainTimeoutMs;

    const tick = () => {
      const n = this.inFlight.get(oldVersion) ?? 0;
      if (n <= 0) {
        this._finishDrain(oldVersion);
        return;
      }
      if (Date.now() >= deadline) {
        this._finishDrain(oldVersion);
        return;
      }
      const t = setTimeout(tick, 10);
      this._drainTimers.set(oldVersion, t);
    };

    tick();
  }

  /**
   * @param {string} version
   */
  _finishDrain(version) {
    const t = this._drainTimers.get(version);
    if (t) {
      clearTimeout(t);
      this._drainTimers.delete(version);
    }
    const cb = this._drainCallbacks.get(version);
    if (cb) {
      try {
        cb(version);
      } catch {
        /* ignore user callback errors */
      }
    }
  }

  /**
   * @param {string} routeName
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  dispatch(routeName, req, res, next) {
    void this._withMutex(async () => {
      const capturedVersion = this.registry.getCurrentVersion();
      if (!capturedVersion) {
        return { ok: false };
      }
      const cur = this.inFlight.get(capturedVersion) ?? 0;
      this.inFlight.set(capturedVersion, cur + 1);
      return { ok: true, capturedVersion };
    }).then((ctx) => {
      if (!ctx || !ctx.ok) {
        res.status(503).setHeader("Content-Type", "application/json");
        res.json({
          error: "service_unavailable",
          message: "Hot reload version not initialized",
          request_id: req.requestId,
        });
        return;
      }

      const { capturedVersion } = ctx;

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        void this._withMutex(async () => {
          const cur = this.inFlight.get(capturedVersion) ?? 0;
          this.inFlight.set(capturedVersion, Math.max(0, cur - 1));
        });
      };

      res.once("finish", done);
      res.once("close", done);

      try {
        const handler = this.registry.getHandlerForVersion(
          capturedVersion,
          routeName,
        );
        if (!handler) {
          done();
          res.status(404).setHeader("Content-Type", "application/json");
          res.json({
            error: "not_found",
            route: routeName,
            request_id: req.requestId,
          });
          return;
        }

        const out = handler(req, res, next);
        if (out && typeof out.then === "function") {
          out
            .then(() => {})
            .catch((err) => {
              done();
              next(err);
            });
        }
      } catch (err) {
        done();
        next(err);
      }
    });
  }

  /**
   * @param {string} version
   * @param {import('express').RequestHandler} handler
   */
  wrapHandler(version, handler) {
    return (req, res, next) => {
      void this._withMutex(async () => {
        const cur = this.inFlight.get(version) ?? 0;
        this.inFlight.set(version, cur + 1);
      }).then(() => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          void this._withMutex(async () => {
            const cur = this.inFlight.get(version) ?? 0;
            this.inFlight.set(version, Math.max(0, cur - 1));
          });
        };
        res.once("finish", done);
        res.once("close", done);
        try {
          const out = handler(req, res, next);
          if (out && typeof out.then === "function") {
            out.catch((err) => {
              done();
              next(err);
            });
          }
        } catch (err) {
          done();
          next(err);
        }
      });
    };
  }

  /**
   * Snapshot for observability.
   */
  getStatusSnapshot() {
    const inflight = {};
    for (const [k, v] of this.inFlight.entries()) {
      inflight[k] = v;
    }
    return {
      currentVersion: this.registry.getCurrentVersion(),
      versions: this.registry.getRegisteredVersions(),
      inFlight: inflight,
    };
  }
}

module.exports = {
  HotReloadManager,
  DRAIN_TIMEOUT_MS,
};
