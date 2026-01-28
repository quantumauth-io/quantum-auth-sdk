interface QuantumAuthWebConfig {
    backendBaseUrl: string;
    appId?: string;
}
interface ProtectedCallOptions<TBody = unknown> {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: TBody;
}
interface ProtectedCallResult<T = unknown> {
    ok: boolean;
    status: number;
    headers: Headers;
    data: T | null;
    raw: Response;
}
declare class QuantumAuthWebClient {
    private readonly backendBaseUrl;
    private readonly appId?;
    constructor(cfg: QuantumAuthWebConfig);
    request<TResp = unknown, TBody = unknown>(opts: ProtectedCallOptions<TBody>): Promise<ProtectedCallResult<TResp>>;
    private requestChallenge;
    private normalizeBackendHost;
}

export { type ProtectedCallOptions, type ProtectedCallResult, QuantumAuthWebClient, type QuantumAuthWebConfig };
