// packages/node/src/index.ts
import {QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH} from "./constants";

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

export async function verifyRequestWithServer(
    cfg: QuantumAuthNodeConfig,
    input: VerificationRequestPayload
): Promise<VerificationResponse> {
    const url = joinUrl(QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH);

    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        cfg.timeoutMs ?? 3000
    );

    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        // for future use
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
            // payload: json?.payload ?? json?.data, // for future encryption
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

export function createExpressQuantumAuthMiddleware(
    cfg: QuantumAuthNodeConfig
) {
    return async function quantumAuthMiddleware(
        req: any,
        res: any,
        next: () => void
    ) {
        try {

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
            };

            const result = await verifyRequestWithServer(cfg, verifyPayload);

            req.userId = result.authenticated ? result.userId : null;

            if (!result.authenticated || !result.userId) {
                res.status(401).json({
                    error: result.error ?? "QuantumAuth authentication failed",
                });
                return;
            }

            // Attach context + decrypted payload to req
            const ctx: QuantumAuthContext = {
                userId: result.userId,
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


function joinUrl(base: string, path: string): string {
    if (!base.endsWith("/") && !path.startsWith("/")) {
        return base + "/" + path;
    }
    if (base.endsWith("/") && path.startsWith("/")) {
        return base + path.slice(1);
    }
    return base + path;
}
