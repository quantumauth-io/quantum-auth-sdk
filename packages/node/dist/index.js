// src/constants/index.ts
var QUANTUMAUTH_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-QuantumAuth-Canonical-B64"
];
var QUANTUMAUTH_VERIFICATION_PATH = "/quantum-auth/v1/auth/verify";
var QUANTUMAUTH_SERVER_URL = "https://api.quantumauth.io";

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
      console.log("QuantumAuth verify request:", verifyPayload);
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
export {
  QUANTUMAUTH_ALLOWED_HEADERS,
  QUANTUMAUTH_SERVER_URL,
  QUANTUMAUTH_VERIFICATION_PATH,
  createExpressQuantumAuthMiddleware,
  joinUrl,
  verifyRequestWithServer
};
//# sourceMappingURL=index.js.map