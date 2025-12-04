/**
 * QuantumAuth Node / backend SDK
 *
 * Goal: make it trivial for a developer to protect an endpoint:
 *
 *   app.post("/api/secure", qaMiddleware, (req, res) => {
 *     // req.quantumAuth.userId, req.quantumAuth.deviceId, req.body = decrypted payload
 *   });
 */
interface QuantumAuthNodeConfig {
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
interface VerificationRequestPayload {
    method: string;
    path: string;
    headers: Record<string, string>;
    encrypted: unknown;
}
/**
 * What we expect back from the QuantumAuth server.
 * Adapt these fields to match your real endpoint’s response.
 */
interface VerificationResponse {
    authenticated: boolean;
    userId?: string;
    deviceId?: string;
    payload?: unknown;
    error?: string;
}
/**
 * Context attached to the Express request object on success.
 */
interface QuantumAuthContext {
    userId: string;
    payload: unknown;
}
/**
 * Low-level helper: verify a single request with the QuantumAuth server.
 * You can reuse this even outside Express (Fastify, etc.).
 */
declare function verifyRequestWithServer(cfg: QuantumAuthNodeConfig, input: VerificationRequestPayload): Promise<VerificationResponse>;
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
declare function createExpressQuantumAuthMiddleware(cfg: QuantumAuthNodeConfig): (req: any, res: any, next: () => void) => Promise<void>;

export { type QuantumAuthContext, type QuantumAuthNodeConfig, type VerificationRequestPayload, type VerificationResponse, createExpressQuantumAuthMiddleware, verifyRequestWithServer };
