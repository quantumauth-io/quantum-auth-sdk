export const QUANTUMAUTH_ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-QuantumAuth-Canonical-B64"
] as const;

export const QUANTUMAUTH_VERIFICATION_PATH: string = "/quantum-auth/v1/auth/verify";
export const QUANTUMAUTH_SERVER_URL: string = "http://localhost:1042";