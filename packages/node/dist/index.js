// src/constants/index.ts
var QUANTUMAUTH_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-QuantumAuth-Canonical-B64"
];
var QUANTUMAUTH_VERIFICATION_PATH = "/quantum-auth/v1/auth/verify";
var QUANTUMAUTH_SERVER_URL = "http://localhost:1042";

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
      userId: json?.user_id ?? json?.userId
      // payload: json?.payload ?? json?.data, // for future encryption
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
        headers: incomingHeaders
      };
      const result = await verifyRequestWithServer(cfg, verifyPayload);
      req.userId = result.authenticated ? result.userId : null;
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
export {
  QUANTUMAUTH_ALLOWED_HEADERS,
  QUANTUMAUTH_SERVER_URL,
  QUANTUMAUTH_VERIFICATION_PATH,
  createExpressQuantumAuthMiddleware,
  verifyRequestWithServer
};
//# sourceMappingURL=index.js.map