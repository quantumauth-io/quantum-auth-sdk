export const QUANTUMAUTH_ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-QuantumAuth-Canonical-B64"
] as const;

export const QUANTUMAUTH_VERIFICATION_PATH: string = "/quantum-auth/v1/auth/verify";

type QAEnv = "local" | "develop" | "production";

function normalizeQAEnv(raw: string | undefined): QAEnv {
    const v = (raw ?? "").trim().toLowerCase();
    switch (v) {
        case "local":
            return "local";
        case "dev":
        case "develop":
        case "development":
            return "develop";
        case "":
        case "prod":
        case "production":
            return "production";
        default:
            throw new Error(`Invalid QA_ENV "${raw}". Allowed: local, develop, production (or empty)`);
    }
}

export const QA_ENV: QAEnv = normalizeQAEnv(process.env.QA_ENV);

// Optional: allow an explicit override (handy for tests/CI)
export const QUANTUMAUTH_SERVER_URL: string =
    (process.env.QUANTUMAUTH_SERVER_URL?.trim() && process.env.QUANTUMAUTH_SERVER_URL.trim()) ||
    (QA_ENV === "local"
        ? "http://localhost:1042"
        : QA_ENV === "develop"
            ? "https://dev.api.quantumauth.io"
            : "https://api.quantumauth.io");