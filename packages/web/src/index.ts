// packages/web/src/index.ts

import type { PqKem, PqKemAlg, PqKemPublicKey } from "./pqkem";

export * from "./pqkem";

export interface QuantumAuthWebConfig {
    qaClientBaseUrl: string;
    backendBaseUrl: string;
    pqKemAlg: PqKemAlg;
    qaKemPublicKeyB64: string;
    pqKem: PqKem;
    appId?: string;
}

export interface ProtectedCallOptions<TBody = unknown> {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: TBody;
    // userId / deviceId removed – SDK will get them from the client
}


export interface ProtectedCallResult<T = unknown> {
    ok: boolean;
    status: number;
    headers: Headers;
    data: T | null;
    raw: Response;
}

interface ChallengeResponse {
    qaProof: Record<string, string>;
}

export interface EncryptedPayload {
    pq_kem_alg: PqKemAlg;
    aead_alg: "AES-GCM-256";
    kem_ciphertext_b64: string;
    aead_iv_b64: string;
    aead_ciphertext_b64: string;
}

interface InternalEncryptOpts {
    payload: unknown;
}

export class QuantumAuthWebClient {
    private readonly qaClientBaseUrl: string;
    private readonly backendBaseUrl: string;

    private readonly pqKem: PqKem;
    private readonly pqKemAlg: PqKemAlg;
    private readonly qaKemPublicKeyB64: string;

    private kemPubKeyPromise: Promise<PqKemPublicKey> | null = null;

    constructor(cfg: QuantumAuthWebConfig) {
        this.qaClientBaseUrl = cfg.qaClientBaseUrl.replace(/\/+$/, "");
        this.backendBaseUrl = cfg.backendBaseUrl.replace(/\/+$/, "");

        this.pqKem = cfg.pqKem;
        this.pqKemAlg = cfg.pqKemAlg;
        this.qaKemPublicKeyB64 = cfg.qaKemPublicKeyB64;
    }

    // NEW: plain signed request (no encryption)
    async request<TResp = unknown, TBody = unknown>(
        opts: ProtectedCallOptions<TBody>
    ): Promise<ProtectedCallResult<TResp>> {
        const challenge = await this.requestChallenge({
            method: opts.method,
            path: opts.path,
            backendHost: this.extractHost(this.backendBaseUrl),
        });
        const url = this.backendBaseUrl + opts.path;

        const headers = new Headers({
            "Content-Type": "application/json",
        });

        // merge QA signature headers from qa-client
        for (const [k, v] of Object.entries(challenge.qaProof)) {
            headers.set(k, v);
        }

        const resp = await fetch(url, {
            method: opts.method,
            headers,
            body:
                opts.method === "GET"
                    ? undefined
                    : JSON.stringify(opts.body ?? {}),
            credentials: "include",
        });

        let data: TResp | null = null;
        try {
            const text = await resp.text();
            data = text ? (JSON.parse(text) as TResp) : null;
        } catch {
            data = null;
        }

        return {
            ok: resp.ok,
            status: resp.status,
            headers: resp.headers,
            data,
            raw: resp,
        };
    }

    async callProtected<TResp = unknown, TBody = unknown>(
        opts: ProtectedCallOptions<TBody>
    ): Promise<ProtectedCallResult<TResp>> {
        const challenge = await this.requestChallenge({
            method: opts.method,
            path: opts.path,
            backendHost: this.extractHost(this.backendBaseUrl),
        });

        const encrypted = await this.encryptPayload({
            payload: opts.body ?? {},
        });

        const url = this.backendBaseUrl + opts.path;

        const headers = new Headers({
            "Content-Type": "application/json",
        });

        console.log("headers");


        for (const [k, v] of Object.entries(challenge.qaProof)) {
            headers.set(k, v);
        }

        const resp = await fetch(url, {
            method: opts.method,
            headers,
            body:
                opts.method === "GET"
                    ? undefined
                    : JSON.stringify(encrypted),
            credentials: "include",
        });

        let data: TResp | null = null;
        try {
            const text = await resp.text();
            data = text ? (JSON.parse(text) as TResp) : null;
        } catch {
            data = null;
        }

        return {
            ok: resp.ok,
            status: resp.status,
            headers: resp.headers,
            data,
            raw: resp,
        };
    }

    private async requestChallenge(params: {
        method: string;
        path: string;
        backendHost: string;
    }): Promise<ChallengeResponse> {
        const url = `${this.qaClientBaseUrl}/api/qa/authenticate`;
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: params.method,
                path: params.path,
                backend_host: params.backendHost,
            }),
            credentials: "include",
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`qa challenge failed: ${resp.status} ${text}`);
        }

        const json = await resp.json();

        return {
            qaProof: json.headers ?? {},

        };
    }

    private async encryptPayload(opts: InternalEncryptOpts): Promise<EncryptedPayload> {
        const kemPubKey = await this.getKemPublicKey();
        const { sharedSecret, ciphertext } = await this.pqKem.encapsulate(kemPubKey);

        const aeadKey = await this.deriveAeadKey(sharedSecret);

        const plaintextObj = {
            payload: opts.payload,
        };

        const plaintext = new TextEncoder().encode(JSON.stringify(plaintextObj));

        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
        const aeadCiphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aeadKey,
            plaintext
        );

        return {
            pq_kem_alg: this.pqKemAlg,
            aead_alg: "AES-GCM-256",
            kem_ciphertext_b64: this.bytesToBase64(ciphertext),
            aead_iv_b64: this.bytesToBase64(iv),
            aead_ciphertext_b64: this.bytesToBase64(
                new Uint8Array(aeadCiphertext)
            ),
        };
    }

    private async getKemPublicKey(): Promise<PqKemPublicKey> {
        if (!this.kemPubKeyPromise) {
            this.kemPubKeyPromise = (async () => {
                const raw = this.base64ToBytes(this.qaKemPublicKeyB64);
                return this.pqKem.importPublicKey(raw, this.pqKemAlg);
            })();
        }
        return this.kemPubKeyPromise;
    }

    private async deriveAeadKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
        const ikm = sharedSecret; // Uint8Array

        const salt = new Uint8Array(32); // all zeros; you can change later
        const info = new TextEncoder().encode("quantum-auth-pq-aead");

        // TS hack: Uint8Array IS an ArrayBufferView, which is a BufferSource.
        // But the typings get confused because of ArrayBufferLike generics.
        const hkdfKey = await crypto.subtle.importKey(
            "raw",
            ikm as unknown as BufferSource,
            { name: "HKDF", hash: "SHA-256" },
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt,
                info,
            },
            hkdfKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
        );
    }

    private base64ToBytes(b64: string): Uint8Array {
        const atobFn =
            typeof atob === "function"
                ? atob
                : (b64Str: string) =>
                    Buffer.from(b64Str, "base64").toString("binary");

        const bin = atobFn(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    private bytesToBase64(bytes: Uint8Array): string {
        const btoaFn =
            typeof btoa === "function"
                ? btoa
                : (binStr: string) =>
                    Buffer.from(binStr, "binary").toString("base64");

        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoaFn(binary);
    }

    private extractHost(url: string): string {
        try {
            const u = new URL(url);
            return u.host;
        } catch {
            return url.replace(/^https?:\/\//, "").split("/")[0];
        }
    }
}
