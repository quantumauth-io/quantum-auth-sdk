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
  QA_ENV: () => QA_ENV,
  QUANTUMAUTH_ALLOWED_HEADERS: () => QUANTUMAUTH_ALLOWED_HEADERS,
  QUANTUMAUTH_SERVER_URL: () => QUANTUMAUTH_SERVER_URL,
  QUANTUMAUTH_VERIFICATION_PATH: () => QUANTUMAUTH_VERIFICATION_PATH,
  createExpressQuantumAuthMiddleware: () => createExpressQuantumAuthMiddleware,
  joinUrl: () => joinUrl,
  verifyRequestWithServer: () => verifyRequestWithServer
});
module.exports = __toCommonJS(index_exports);

// src/constants/index.ts
var QUANTUMAUTH_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-QuantumAuth-Canonical-B64"
];
var QUANTUMAUTH_VERIFICATION_PATH = "/quantum-auth/v1/auth/verify";
function normalizeQAEnv(raw) {
  const v = (raw ?? "").trim().toLowerCase();
  switch (v) {
    case "local":
      return "local";
    case "dev":
    case "develop":
    case "development":
      return "develop";
    case "":
    case "prod":
    case "production":
      return "production";
    default:
      throw new Error(`Invalid QA_ENV "${raw}". Allowed: local, develop, production (or empty)`);
  }
}
var QA_ENV = normalizeQAEnv(process.env.QA_ENV);
var QUANTUMAUTH_SERVER_URL = process.env.QUANTUMAUTH_SERVER_URL?.trim() && process.env.QUANTUMAUTH_SERVER_URL.trim() || (QA_ENV === "local" ? "http://localhost:1042" : QA_ENV === "develop" ? "https://dev.api.quantumauth.io" : "https://api.quantumauth.io");

// src/index.ts
async function verifyRequestWithServer(cfg, input) {
  const url = joinUrl(QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH);
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
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const errorMessage = json?.error ?? `QA server verify failed: HTTP ${res.status} ${res.statusText}`;
      return {
        authenticated: false,
        error: errorMessage
      };
    }
    return {
      authenticated: Boolean(json?.authenticated),
      userId: json?.user_id ?? json?.userId,
      payload: json?.payload ?? json?.data
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      authenticated: false,
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}
function createExpressQuantumAuthMiddleware(cfg) {
  return async function quantumAuthMiddleware(req, res, next) {
    try {
      const encrypted = req.body;
      if (encrypted == null) {
        res.status(400).json({ error: "Missing request body for QuantumAuth" });
        return;
      }
      const method = req.method;
      const path = req.originalUrl || req.url || "";
      const incomingHeaders = {};
      const rawHeaders = req.headers ?? {};
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value == null) continue;
        const lower = key.toLowerCase();
        if (lower === "authorization" || lower.startsWith("x-quantumauth-") || lower === "x-qa-signature") {
          incomingHeaders[key] = Array.isArray(value) ? value.join(",") : String(value);
        }
      }
      const verifyPayload = {
        method,
        path,
        headers: incomingHeaders
      };
      const result = await verifyRequestWithServer(cfg, verifyPayload);
      req.userId = result.authenticated && result.userId ? result.userId : void 0;
      const userId = result.userId;
      if (!result.authenticated || !userId) {
        res.status(401).json({
          error: result.error ?? "QuantumAuth authentication failed"
        });
        return;
      }
      const ctx = {
        userId,
        payload: result.payload
      };
      req.quantumAuth = ctx;
      req.qa = ctx;
      if (result.payload !== void 0) {
        req.body = result.payload;
      }
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: `QuantumAuth middleware error: ${message}`
      });
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
  QA_ENV,
  QUANTUMAUTH_ALLOWED_HEADERS,
  QUANTUMAUTH_SERVER_URL,
  QUANTUMAUTH_VERIFICATION_PATH,
  createExpressQuantumAuthMiddleware,
  joinUrl,
  verifyRequestWithServer
});
//# sourceMappingURL=index.cjs.map