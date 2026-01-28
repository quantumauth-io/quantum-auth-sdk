// src/extensionBridge.ts
var cachedExtensionAvailable = null;
function qaRequest(payload, timeoutMs = 15e3) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("qaRequest must be called in a browser context"));
  }
  return new Promise((resolve, reject) => {
    const correlationId = window.crypto?.randomUUID?.() ?? `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("QuantumAuth extension timeout"));
    }, timeoutMs);
    function onMessage(event) {
      const msg = event.data;
      if (!msg || msg.type !== "QUANTUMAUTH_RESPONSE" || msg.correlationId !== correlationId) {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      const p = msg.payload;
      const deepError = p?.error ?? p?.data?.error ?? p?.data?.message;
      const isOk = msg.error == null && p?.ok !== false && p?.data?.ok !== false;
      if (!isOk) {
        reject(new Error(msg.error || deepError || "QuantumAuth extension error"));
        return;
      }
      resolve(p?.data);
    }
    window.addEventListener("message", onMessage);
    window.postMessage(
      { type: "QUANTUMAUTH_REQUEST", correlationId, payload },
      "*"
    );
  });
}
async function isQuantumAuthExtensionAvailable(timeoutMs = 1e3) {
  if (typeof window === "undefined") return false;
  if (cachedExtensionAvailable === true) return true;
  try {
    await qaRequest({ action: "ping" }, timeoutMs);
    cachedExtensionAvailable = true;
    return true;
  } catch {
    return false;
  }
}

// src/index.ts
var QuantumAuthWebClient = class {
  constructor(cfg) {
    this.backendBaseUrl = cfg.backendBaseUrl.replace(/\/+$/, "");
    this.appId = cfg.appId;
  }
  async request(opts) {
    const challenge = await this.requestChallenge({
      method: opts.method,
      path: opts.path,
      backendHost: this.normalizeBackendHost(this.backendBaseUrl)
    });
    const url = this.backendBaseUrl + opts.path;
    console.log("url", url);
    const headers = new Headers({
      "Content-Type": "application/json"
    });
    for (const [k, v] of Object.entries(challenge.qaProof)) {
      headers.set(k, v);
    }
    const resp = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.method === "GET" ? void 0 : JSON.stringify(opts.body ?? {}),
      credentials: "include"
    });
    let data = null;
    try {
      const text = await resp.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return {
      ok: resp.ok,
      status: resp.status,
      headers: resp.headers,
      data,
      raw: resp
    };
  }
  async requestChallenge(params) {
    if (typeof window === "undefined") {
      throw new Error(
        "QuantumAuthWebClient.requestChallenge must run in a browser"
      );
    }
    const hasExtension = await isQuantumAuthExtensionAvailable();
    if (!hasExtension) {
      throw new Error(
        "QuantumAuth browser extension not detected. Please install the QuantumAuth extension to use protected requests."
      );
    }
    const resp = await qaRequest({
      action: "request_challenge",
      data: {
        method: params.method,
        path: params.path,
        backendHost: params.backendHost,
        appId: this.appId
      }
    });
    const qaProof = resp.qaProof ?? resp.data?.qaProof ?? {};
    return {
      qaProof
    };
  }
  normalizeBackendHost(input) {
    const s = String(input || "").trim();
    if (!s) return "";
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s) ? s : `http://${s}`;
    let u;
    try {
      u = new URL(withScheme);
    } catch {
      const raw = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "").split("/")[0].trim();
      return raw.toLowerCase();
    }
    const host = u.hostname.trim().toLowerCase();
    let port = u.port ? String(u.port).trim() : "";
    if (port === "80" || port === "443") port = "";
    return port ? `${host}:${port}` : host;
  }
};
export {
  QuantumAuthWebClient
};
//# sourceMappingURL=index.js.map