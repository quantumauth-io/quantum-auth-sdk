import { Request, RequestHandler } from 'express';

declare const QUANTUMAUTH_ALLOWED_HEADERS: readonly ["Content-Type", "Authorization", "X-QA-App-Id", "X-QA-Aud", "X-QA-Ts", "X-QA-Challenge-Id", "X-QA-User-Id", "X-QA-Device-Id", "X-QA-Body-Sha256", "X-QA-Sig-Ver"];
declare const QUANTUMAUTH_VERIFICATION_PATH: string;
type QAEnv = "local" | "develop" | "production";
declare const QA_ENV: QAEnv;
declare const QUANTUMAUTH_SERVER_URL: string;

interface QuantumAuthNodeConfig {
    backendApiKey?: string;
    timeoutMs?: number;
}
interface VerificationRequestPayload {
    method: string;
    path: string;
    headers: Record<string, string>;
}
interface VerificationResponse {
    authenticated: boolean;
    userId?: string;
    payload?: unknown;
    error?: string;
}
interface QuantumAuthContext {
    userId: string;
    payload: unknown;
}
interface QuantumAuthRequest extends Request {
    userId?: string;
    quantumAuth?: QuantumAuthContext;
    qa?: QuantumAuthContext;
}
declare function verifyRequestWithServer(cfg: QuantumAuthNodeConfig, input: VerificationRequestPayload): Promise<VerificationResponse>;
declare function createExpressQuantumAuthMiddleware(cfg: QuantumAuthNodeConfig): RequestHandler;
declare function joinUrl(base: string, path: string): string;

export { QA_ENV, QUANTUMAUTH_ALLOWED_HEADERS, QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH, type QuantumAuthContext, type QuantumAuthNodeConfig, type QuantumAuthRequest, type VerificationRequestPayload, type VerificationResponse, createExpressQuantumAuthMiddleware, joinUrl, verifyRequestWithServer };
