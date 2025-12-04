type PqKemAlg = "ML-KEM-768" | "ML-KEM-1024";
interface PqKemPublicKey {
    alg: PqKemAlg;
    raw: Uint8Array;
}
/**
 * Abstract PQ KEM interface.
 * You plug in your own implementation (WASM / JS).
 */
interface PqKem {
    importPublicKey(raw: Uint8Array, alg: PqKemAlg): Promise<PqKemPublicKey>;
    encapsulate(pk: PqKemPublicKey): Promise<{
        sharedSecret: Uint8Array;
        ciphertext: Uint8Array;
    }>;
}

interface QuantumAuthWebConfig {
    qaClientBaseUrl: string;
    backendBaseUrl: string;
    pqKemAlg: PqKemAlg;
    qaKemPublicKeyB64: string;
    pqKem: PqKem;
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
interface EncryptedPayload {
    pq_kem_alg: PqKemAlg;
    aead_alg: "AES-GCM-256";
    app_id?: string;
    challenge_id: string;
    nonce: number;
    kem_ciphertext_b64: string;
    aead_iv_b64: string;
    aead_ciphertext_b64: string;
}
declare class QuantumAuthWebClient {
    private readonly qaClientBaseUrl;
    private readonly backendBaseUrl;
    private readonly appId?;
    private readonly pqKem;
    private readonly pqKemAlg;
    private readonly qaKemPublicKeyB64;
    private kemPubKeyPromise;
    constructor(cfg: QuantumAuthWebConfig);
    request<TResp = unknown, TBody = unknown>(opts: ProtectedCallOptions<TBody>): Promise<ProtectedCallResult<TResp>>;
    callProtected<TResp = unknown, TBody = unknown>(opts: ProtectedCallOptions<TBody>): Promise<ProtectedCallResult<TResp>>;
    private requestChallenge;
    private encryptPayload;
    private getKemPublicKey;
    private deriveAeadKey;
    private base64ToBytes;
    private bytesToBase64;
    private extractHost;
}

export { type EncryptedPayload, type PqKem, type PqKemAlg, type PqKemPublicKey, type ProtectedCallOptions, type ProtectedCallResult, QuantumAuthWebClient, type QuantumAuthWebConfig };
