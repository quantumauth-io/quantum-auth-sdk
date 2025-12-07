declare const QUANTUMAUTH_ALLOWED_HEADERS: readonly ["Content-Type", "Authorization", "X-QuantumAuth-Canonical-B64"];
declare const QUANTUMAUTH_VERIFICATION_PATH: string;
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
declare function verifyRequestWithServer(cfg: QuantumAuthNodeConfig, input: VerificationRequestPayload): Promise<VerificationResponse>;
declare function createExpressQuantumAuthMiddleware(cfg: QuantumAuthNodeConfig): (req: any, res: any, next: () => void) => Promise<void>;

export { QUANTUMAUTH_ALLOWED_HEADERS, QUANTUMAUTH_SERVER_URL, QUANTUMAUTH_VERIFICATION_PATH, type QuantumAuthContext, type QuantumAuthNodeConfig, type VerificationRequestPayload, type VerificationResponse, createExpressQuantumAuthMiddleware, verifyRequestWithServer };
