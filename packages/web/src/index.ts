// packages/web/src/index.ts
import {isQuantumAuthExtensionAvailable, qaRequest} from "./extensionBridge";

export interface QuantumAuthWebConfig {
    backendBaseUrl: string;
    appId?: string;
}

export interface ProtectedCallOptions<TBody = unknown> {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: TBody;
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

export class QuantumAuthWebClient {
    private readonly backendBaseUrl: string;
    private readonly appId?: string;

    constructor(cfg: QuantumAuthWebConfig) {
        this.backendBaseUrl = cfg.backendBaseUrl.replace(/\/+$/, "");
        this.appId = cfg.appId;
    }

    async request<TResp = unknown, TBody = unknown>(
        opts: ProtectedCallOptions<TBody>,
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

        for (const [k, v] of Object.entries(challenge.qaProof)) {
            headers.set(k, v);
        }

        const resp = await fetch(url, {
            method: opts.method,
            headers,
            body: opts.method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
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
        if (typeof window === "undefined") {
            throw new Error(
                "QuantumAuthWebClient.requestChallenge must run in a browser",
            );
        }
// todo move this outside of the request.
        const hasExtension = await isQuantumAuthExtensionAvailable();
        if (!hasExtension) {
            throw new Error(
                "QuantumAuth browser extension not detected. Please install the QuantumAuth extension to use protected requests.",
            );
        }

        const resp = await qaRequest<{
            qaProof?: Record<string, string>;
            data?: { qaProof?: Record<string, string> };
        }>({
            action: "request_challenge",
            data: {
                method: params.method,
                path: params.path,
                backendHost: params.backendHost,
                appId: this.appId,
            },
        });

        const qaProof =
            resp.qaProof ??
            resp.data?.qaProof ??
            {};

        return {
            qaProof,
        };
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
