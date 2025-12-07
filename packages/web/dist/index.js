// src/constants/index.ts
var clientURL = "http://localhost:8090";

// src/index.ts
var QuantumAuthWebClient = class {
  constructor(cfg) {
    this.qaClientBaseUrl = clientURL;
    this.backendBaseUrl = cfg.backendBaseUrl.replace(/\/+$/, "");
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
  /**
   * Makes an asynchronous request to get a QA challenge from the qa client.
   *
   * @param {Object} params - The parameters required to request the challenge.
   * @param {string} params.method - The HTTP method used in the challenge request.
   * @param {string} params.path - The backend API path for which the challenge is requested.
   * @param {string} params.backendHost - The backend host to authenticate with.
   * @return {Promise<ChallengeResponse>} A promise that resolves to the challenge response, containing the required proof.
   * @throws {Error} If the response status indicates a failure or the server returns an error.
   */
  async requestChallenge(params) {
    const url = `${this.qaClientBaseUrl}/api/qa/authenticate`;
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
      qaProof: json.headers ?? {}
    };
  }
  /**
   * Extracts the host from the given URL string. If the URL is invalid, it attempts to manually parse and extract the host.
   *
   * @param {string} url - The URL string from which the host needs to be extracted.
   * @return {string} The extracted host from the provided URL.
   */
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
  QuantumAuthWebClient,
  clientURL
};
//# sourceMappingURL=index.js.map