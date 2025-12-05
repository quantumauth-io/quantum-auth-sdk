"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createExpressQuantumAuthMiddleware: () => createExpressQuantumAuthMiddleware,
  verifyRequestWithServer: () => verifyRequestWithServer
});
module.exports = __toCommonJS(index_exports);
async function verifyRequestWithServer(cfg, input) {
  const verifyPath = cfg.verifyPath ?? "/quantum-auth/verify-request";
  const url = joinUrl(cfg.qaServerUrl, verifyPath);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    cfg.timeoutMs ?? 3e3
  );
  try {
    const headers = {
      "Content-Type": "application/json"
    };
    if (cfg.backendApiKey) {
      headers["X-QuantumAuth-Backend-Key"] = cfg.backendApiKey;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: controller.signal
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      return {
        authenticated: false,
        error: json?.error ?? `QA server verify failed: HTTP ${res.status} ${res.statusText}`
      };
    }
    return {
      authenticated: !!json?.authenticated,
      userId: json?.user_id ?? json?.userId,
      payload: json?.payload ?? json?.data,
      error: json?.error
    };
  } catch (err) {
    return {
      authenticated: false,
      error: String(err?.message ?? err)
    };
  } finally {
    clearTimeout(timeout);
  }
}
function createExpressQuantumAuthMiddleware(cfg) {
  return async function quantumAuthMiddleware(req, res, next) {
    try {
      const encrypted = req.body;
      if (!encrypted) {
        res.status(400).json({ error: "Missing request body for QuantumAuth" });
        return;
      }
      const method = req.method;
      const path = req.originalUrl || req.url || "";
      const incomingHeaders = {};
      const rawHeaders = req.headers || {};
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (!value) continue;
        const lower = key.toLowerCase();
        if (lower === "authorization" || lower.startsWith("x-quantumauth-") || lower === "x-qa-signature") {
          incomingHeaders[key] = Array.isArray(value) ? value.join(",") : String(value);
        }
      }
      const verifyPayload = {
        method,
        path,
        headers: incomingHeaders,
        encrypted
      };
      const result = await verifyRequestWithServer(cfg, verifyPayload);
      console.log("result", result);
      if (!result.authenticated || !result.userId) {
        res.status(401).json({
          error: result.error ?? "QuantumAuth authentication failed"
        });
        return;
      }
      const ctx = {
        userId: result.userId,
        payload: result.payload
      };
      req.quantumAuth = ctx;
      req.qa = ctx;
      if (result.payload !== void 0) {
        req.body = result.payload;
      }
      return next();
    } catch (err) {
      res.status(500).json({ error: `QuantumAuth middleware error: ${String(err)}` });
    }
  };
}
function joinUrl(base, path) {
  if (!base.endsWith("/") && !path.startsWith("/")) {
    return base + "/" + path;
  }
  if (base.endsWith("/") && path.startsWith("/")) {
    return base + path.slice(1);
  }
  return base + path;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createExpressQuantumAuthMiddleware,
  verifyRequestWithServer
});
//# sourceMappingURL=index.cjs.map