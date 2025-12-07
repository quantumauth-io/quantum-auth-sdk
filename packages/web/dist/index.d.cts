declare const clientURL: string;

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
/**
 * Represents a web client used for managing quantum-authenticated requests to a backend.
 * Responsible for handling challenge-response mechanisms and ensuring secure communication.
 */
declare class QuantumAuthWebClient {
    private readonly qaClientBaseUrl;
    private readonly backendBaseUrl;
    constructor(cfg: QuantumAuthWebConfig);
    request<TResp = unknown, TBody = unknown>(opts: ProtectedCallOptions<TBody>): Promise<ProtectedCallResult<TResp>>;
    /**
     * Makes an asynchronous request to get a QA challenge from the qa client.
     *
     * @param {Object} params - The parameters required to request the challenge.
     * @param {string} params.method - The HTTP method used in the challenge request.
     * @param {string} params.path - The backend API path for which the challenge is requested.
     * @param {string} params.backendHost - The backend host to authenticate with.
     * @return {Promise<ChallengeResponse>} A promise that resolves to the challenge response, containing the required proof.
     * @throws {Error} If the response status indicates a failure or the server returns an error.
     */
    private requestChallenge;
    /**
     * Extracts the host from the given URL string. If the URL is invalid, it attempts to manually parse and extract the host.
     *
     * @param {string} url - The URL string from which the host needs to be extracted.
     * @return {string} The extracted host from the provided URL.
     */
    private extractHost;
}

export { type ProtectedCallOptions, type ProtectedCallResult, QuantumAuthWebClient, type QuantumAuthWebConfig, clientURL };
