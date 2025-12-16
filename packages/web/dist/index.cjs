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
  QuantumAuthWebClient: () => QuantumAuthWebClient
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QuantumAuthWebClient
});
//# sourceMappingURL=index.cjs.map