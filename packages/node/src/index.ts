// packages/node/src/index.ts
import {
    QUANTUMAUTH_SERVER_URL,
    QUANTUMAUTH_VERIFICATION_PATH,
} from "./constants";

import type { Request, Response, NextFunction, RequestHandler } from "express";

export * from "./constants";

export interface QuantumAuthNodeConfig {
    backendApiKey?: string;
    timeoutMs?: number;
}

export interface VerificationRequestPayload {
    method: string;
    path: string;
    headers: Record<string, string>;
}

export interface VerificationResponse {
    authenticated: boolean;
    userId?: string;
    payload?: unknown; // decrypted payload
    error?: string;
}

export interface QuantumAuthContext {
    userId: string;
    payload: unknown;
}

// Express request shape after QuantumAuth middleware
export interface QuantumAuthRequest extends Request {
    userId?: string;
    quantumAuth?: QuantumAuthContext;
    qa?: QuantumAuthContext;
}


type VerifyResponseBody = {
    authenticated?: boolean;
    user_id?: string;
    userId?: string;
    payload?: unknown;
    data?: unknown;
    error?: string;
};

export async function verifyRequestWithServer(
    cfg: QuantumAuthNodeConfig,
    input: VerificationRequestPayload,
): Promise<VerificationResponse> {
    const url = joinUrl(QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH);

    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs ?? 3000,
    );

    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (cfg.backendApiKey) {
            headers["X-QuantumAuth-Backend-Key"] = cfg.backendApiKey;
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(input),
            signal: controller.signal,
        });

        const text = await res.text();
        let json: VerifyResponseBody | null;

        try {
            json = text ? (JSON.parse(text) as VerifyResponseBody) : null;
        } catch {
            json = null;
        }

        if (!res.ok) {
            const errorMessage =
                json?.error ??
                `QA server verify failed: HTTP ${res.status} ${res.statusText}`;

            return {
                authenticated: false,
                error: errorMessage,
            };
        }

        return {
            authenticated: Boolean(json?.authenticated),
            userId: json?.user_id ?? json?.userId,
            payload: json?.payload ?? json?.data,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : String(err);

        return {
            authenticated: false,
            error: message,
        };
    } finally {
        clearTimeout(timeout);
    }
}

export function createExpressQuantumAuthMiddleware(
    cfg: QuantumAuthNodeConfig,
): RequestHandler {
    return async function quantumAuthMiddleware(
        req: QuantumAuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const encrypted = req.body;

            if (encrypted == null) {
                res
                    .status(400)
                    .json({ error: "Missing request body for QuantumAuth" });
                return;
            }

            const method = req.method;
            const path = req.originalUrl || req.url || "";

            const incomingHeaders: Record<string, string> = {};
            const rawHeaders = req.headers ?? {};

            for (const [key, value] of Object.entries(rawHeaders)) {
                if (value == null) continue;

                const lower = key.toLowerCase();
                if (
                    lower === "authorization" ||
                    lower.startsWith("x-quantumauth-") ||
                    lower === "x-qa-signature"
                ) {
                    incomingHeaders[key] = Array.isArray(value)
                        ? value.join(",")
                        : String(value);
                }
            }

            const verifyPayload: VerificationRequestPayload = {
                method,
                path,
                headers: incomingHeaders,
            };

            const result = await verifyRequestWithServer(cfg, verifyPayload);

            req.userId = result.authenticated && result.userId ? result.userId : undefined;

            const userId = result.userId;

            if (!result.authenticated || !userId) {
                res.status(401).json({
                    error: result.error ?? "QuantumAuth authentication failed",
                });
                return;
            }

            const ctx: QuantumAuthContext = {
                userId,
                payload: result.payload,
            };

            req.quantumAuth = ctx;
            req.qa = ctx;

            if (result.payload !== undefined) {
                // decrypted payload becomes the new body
                req.body = result.payload as unknown;
            }

            next();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : String(err);

            res
                .status(500)
                .json({
                    error: `QuantumAuth middleware error: ${message}`,
                });
        }
    };
}

export function joinUrl(base: string, path: string): string {
    if (!base.endsWith("/") && !path.startsWith("/")) {
        return base + "/" + path;
    }
    if (base.endsWith("/") && path.startsWith("/")) {
        return base + path.slice(1);
    }
    return base + path;
}
