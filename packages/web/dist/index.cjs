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
var QuantumAuthWebClient = class {
  constructor(cfg) {
    this.kemPubKeyPromise = null;
    this.qaClientBaseUrl = cfg.qaClientBaseUrl.replace(/\/+$/, "");
    this.backendBaseUrl = cfg.backendBaseUrl.replace(/\/+$/, "");
    this.appId = cfg.appId;
    this.pqKem = cfg.pqKem;
    this.pqKemAlg = cfg.pqKemAlg;
    this.qaKemPublicKeyB64 = cfg.qaKemPublicKeyB64;
  }
  // NEW: plain signed request (no encryption)
  async request(opts) {
    const challenge = await this.requestChallenge({
      method: opts.method,
      path: opts.path,
      backendHost: this.extractHost(this.backendBaseUrl)
    });
    const url = this.backendBaseUrl + opts.path;
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-QuantumAuth-Challenge-ID": challenge.challengeId,
      "X-QuantumAuth-Nonce": String(challenge.nonce),
      "X-QuantumAuth-App-ID": this.appId ?? "",
      "X-QuantumAuth-User-ID": challenge.userId,
      "X-QuantumAuth-Device-ID": challenge.deviceId
    });
    console.log("request headers", challenge);
    for (const [k, v] of Object.entries(challenge.qaHeaders)) {
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
  async callProtected(opts) {
    const challenge = await this.requestChallenge({
      method: opts.method,
      path: opts.path,
      backendHost: this.extractHost(this.backendBaseUrl)
    });
    const encrypted = await this.encryptPayload({
      challengeId: challenge.challengeId,
      nonce: challenge.nonce,
      appId: this.appId,
      payload: opts.body ?? {}
    });
    const url = this.backendBaseUrl + opts.path;
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-QuantumAuth-Encrypted": "1",
      "X-QuantumAuth-Challenge-ID": challenge.challengeId,
      "X-QuantumAuth-Nonce": String(challenge.nonce),
      "X-QuantumAuth-App-ID": this.appId ?? "",
      "X-QuantumAuth-User-ID": challenge.userId,
      "X-QuantumAuth-Device-ID": challenge.deviceId
    });
    console.log("headers");
    for (const [k, v] of Object.entries(challenge.qaHeaders)) {
      headers.set(k, v);
    }
    const resp = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.method === "GET" ? void 0 : JSON.stringify(encrypted),
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
    const url = `${this.qaClientBaseUrl}/api/auth/challenge`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: params.method,
        path: params.path,
        backend_host: params.backendHost
      }),
      credentials: "include"
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`qa challenge failed: ${resp.status} ${text}`);
    }
    const json = await resp.json();
    return {
      challengeId: json.challenge_id,
      nonce: json.nonce,
      qaHeaders: json.headers ?? {},
      userId: json.user_id,
      deviceId: json.device_id
    };
  }
  async encryptPayload(opts) {
    const kemPubKey = await this.getKemPublicKey();
    const { sharedSecret, ciphertext } = await this.pqKem.encapsulate(kemPubKey);
    const aeadKey = await this.deriveAeadKey(sharedSecret);
    const plaintextObj = {
      challenge_id: opts.challengeId,
      nonce: opts.nonce,
      app_id: opts.appId,
      payload: opts.payload
    };
    const plaintext = new TextEncoder().encode(JSON.stringify(plaintextObj));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aeadCiphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aeadKey,
      plaintext
    );
    return {
      pq_kem_alg: this.pqKemAlg,
      aead_alg: "AES-GCM-256",
      app_id: opts.appId,
      challenge_id: opts.challengeId,
      nonce: opts.nonce,
      kem_ciphertext_b64: this.bytesToBase64(ciphertext),
      aead_iv_b64: this.bytesToBase64(iv),
      aead_ciphertext_b64: this.bytesToBase64(
        new Uint8Array(aeadCiphertext)
      )
    };
  }
  async getKemPublicKey() {
    if (!this.kemPubKeyPromise) {
      this.kemPubKeyPromise = (async () => {
        const raw = this.base64ToBytes(this.qaKemPublicKeyB64);
        return this.pqKem.importPublicKey(raw, this.pqKemAlg);
      })();
    }
    return this.kemPubKeyPromise;
  }
  async deriveAeadKey(sharedSecret) {
    const ikm = sharedSecret;
    const salt = new Uint8Array(32);
    const info = new TextEncoder().encode("quantum-auth-pq-aead");
    const hkdfKey = await crypto.subtle.importKey(
      "raw",
      ikm,
      { name: "HKDF", hash: "SHA-256" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info
      },
      hkdfKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
  }
  base64ToBytes(b64) {
    const atobFn = typeof atob === "function" ? atob : (b64Str) => Buffer.from(b64Str, "base64").toString("binary");
    const bin = atobFn(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  bytesToBase64(bytes) {
    const btoaFn = typeof btoa === "function" ? btoa : (binStr) => Buffer.from(binStr, "binary").toString("base64");
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoaFn(binary);
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