// packages/web/src/pqkem.ts

export type PqKemAlg = "ML-KEM-768" | "ML-KEM-1024";

export interface PqKemPublicKey {
    alg: PqKemAlg;
    raw: Uint8Array; // encoded KEM public key
}

/**
 * Abstract PQ KEM interface.
 * You plug in your own implementation (WASM / JS).
 */
export interface PqKem {
    importPublicKey(raw: Uint8Array, alg: PqKemAlg): Promise<PqKemPublicKey>;

    encapsulate(
        pk: PqKemPublicKey
    ): Promise<{
        sharedSecret: Uint8Array; // input to HKDF
        ciphertext: Uint8Array;   // KEM ciphertext to send to server
    }>;
}
