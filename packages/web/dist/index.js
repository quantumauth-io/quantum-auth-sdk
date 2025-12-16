// src/extensionBridge.ts
function qaRequest(payload, timeoutMs = 15e3) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("qaRequest must be called in a browser context")
    );
  }
  return new Promise((resolve, reject) => {
    const correlationId = window.crypto?.randomUUID?.() ?? `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("QuantumAuth extension timeout"));
    }, timeoutMs);
    function onMessage(event) {
      const msg = event.data;
      console.log("Received response from QuantumAuth extension:", msg);
      if (!msg || msg.type !== "QUANTUMAUTH_RESPONSE" || msg.correlationId !== correlationId) {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (msg.error || msg.payload?.ok === false) {
        reject(
          new Error(
            msg.error || msg.payload?.error || "QuantumAuth extension error"
          )
        );
      } else {
        resolve(msg.payload?.data);
      }
    }
    window.addEventListener("message", onMessage);
    console.log("Sending request to QuantumAuth extension:", payload);
    window.postMessage(
      {
        type: "QUANTUMAUTH_REQUEST",
        correlationId,
        payload
      },
      "*"
    );
  });
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
      backendHost: this.extractHost(this.backendBaseUrl)
    });
    const url = this.backendBaseUrl + opts.path;
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
    const resp = await qaRequest({
      action: "request_challenge",
      data: {
        method: params.method,
        path: params.path,
        backendHost: params.backendHost,
        appId: this.appId
      }
    });
    console.log("QuantumAuth challenge response:", resp);
    const qaProof = resp.qaProof ?? resp.data?.qaProof ?? {};
    console.log("QuantumAuth challenge response:", qaProof);
    return {
      qaProof
    };
  }
  extractHost(url) {
    try {
      const u = new URL(url);
      return u.host;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
};
export {
  QuantumAuthWebClient
};
//# sourceMappingURL=index.js.map