// packages/node/src/index.ts

/**
 * QuantumAuth Node / backend SDK
 *
 * Goal: make it trivial for a developer to protect an endpoint:
 *
 *   app.post("/api/secure", qaMiddleware, (req, res) => {
 *     // req.quantumAuth.userId, req.quantumAuth.deviceId, req.body = decrypted payload
 *   });
 */

export interface QuantumAuthNodeConfig {
    /** Base URL of the QuantumAuth server, e.g. "http://localhost:1042" */
    qaServerUrl: string;

    /**
     * Path of the verification endpoint on the QuantumAuth server.
     * You said you already have “an endpoint to verify request” – plug it here.
     * Example: "/quantum-auth/verify-request"
     */
    verifyPath?: string;

    /**
     * Optional shared secret/API key between your backend and the QA server.
     * If used, the QA server can require this in an "X-QuantumAuth-Backend-Key" header.
     */
    backendApiKey?: string;

    /** Timeout for the call to the QA server (ms). Default: 3000 */
    timeoutMs?: number;
}

/**
 * What we send from backend → QuantumAuth server to verify/decrypt.
 * This must match what the QA server expects.
 */
export interface VerificationRequestPayload {
    method: string;
    path: string;
    headers: Record<string, string>;
    encrypted: unknown; // the EncryptedPayload JSON received from the frontend
}

/**
 * What we expect back from the QuantumAuth server.
 * Adapt these fields to match your real endpoint’s response.
 */
export interface VerificationResponse {
    authenticated: boolean;
    userId?: string;
    deviceId?: string;
    payload?: unknown; // decrypted payload
    error?: string;
}

/**
 * Context attached to the Express request object on success.
 */
export interface QuantumAuthContext {
    userId: string;
    deviceId: string;
    payload: unknown;
}

/**
 * Low-level helper: verify a single request with the QuantumAuth server.
 * You can reuse this even outside Express (Fastify, etc.).
 */
export async function verifyRequestWithServer(
    cfg: QuantumAuthNodeConfig,
    input: VerificationRequestPayload
): Promise<VerificationResponse> {
    const verifyPath = cfg.verifyPath ?? "/quantum-auth/verify-request";
    const url = joinUrl(cfg.qaServerUrl, verifyPath);

    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs ?? 3000
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
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }

        if (!res.ok) {
            return {
                authenticated: false,
                error:
                    json?.error ??
                    `QA server verify failed: HTTP ${res.status} ${res.statusText}`,
            };
        }

        return {
            authenticated: !!json?.authenticated,
            userId: json?.user_id ?? json?.userId,
            deviceId: json?.device_id ?? json?.deviceId,
            payload: json?.payload ?? json?.data,
            error: json?.error,
        };
    } catch (err: any) {
        return {
            authenticated: false,
            error: String(err?.message ?? err),
        };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Express-compatible middleware factory.
 *
 * Usage:
 *
 *   import express from "express";
 *   import { createExpressQuantumAuthMiddleware } from "@quantumauth/node";
 *
 *   const app = express();
 *   app.use(express.json()); // IMPORTANT: parse JSON body first
 *
 *   app.post(
 *     "/api/secure",
 *     createExpressQuantumAuthMiddleware({
 *       qaServerUrl: "http://localhost:1042",
 *       verifyPath: "/quantum-auth/verify-request",
 *       backendApiKey: process.env.QA_BACKEND_KEY,
 *     }),
 *     (req, res) => {
 *       const qa = (req as any).quantumAuth as QuantumAuthContext;
 *       // qa.userId, qa.deviceId, qa.payload (== req.body)
 *       res.json({ ok: true, user: qa.userId, data: qa.payload });
 *     }
 *   );
 */
export function createExpressQuantumAuthMiddleware(
    cfg: QuantumAuthNodeConfig
) {
    return async function quantumAuthMiddleware(
        req: any,
        res: any,
        next: () => void
    ) {
        try {
            // Expect body to be the encrypted JSON coming from @quantumauth/web.
            const encrypted = req.body;

            if (!encrypted) {
                res.status(400).json({ error: "Missing request body for QuantumAuth" });
                return;
            }

            const method: string = req.method;
            const path: string = req.originalUrl || req.url || "";

            // Extract only QuantumAuth-related headers to send to QA server
            const incomingHeaders: Record<string, string> = {};
            const rawHeaders = req.headers || {};
            console.log(rawHeaders)

            for (const [key, value] of Object.entries(rawHeaders)) {
                if (!value) continue;

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
                encrypted,
            };

            const result = await verifyRequestWithServer(cfg, verifyPayload);

            if (!result.authenticated || !result.userId || !result.deviceId) {
                res.status(401).json({
                    error: result.error ?? "QuantumAuth authentication failed",
                });
                return;
            }

            // Attach context + decrypted payload to req
            const ctx: QuantumAuthContext = {
                userId: result.userId,
                deviceId: result.deviceId,
                payload: result.payload,
            };

            (req as any).quantumAuth = ctx;
            (req as any).qa = ctx; // short alias
            if (result.payload !== undefined) {
                req.body = result.payload;
            }

            return next();
        } catch (err: any) {
            res
                .status(500)
                .json({ error: `QuantumAuth middleware error: ${String(err)}` });
        }
    };
}

// ---------- helpers ----------

function joinUrl(base: string, path: string): string {
    if (!base.endsWith("/") && !path.startsWith("/")) {
        return base + "/" + path;
    }
    if (base.endsWith("/") && path.startsWith("/")) {
        return base + path.slice(1);
    }
    return base + path;
}
