// Tiny helper used by web apps to talk to the QuantumAuth browser extension.

export interface QuantumAuthExtensionPayload<T = unknown> {
    action: string;
    data?: T;
}

let cachedExtensionAvailable: boolean | null = null;


export function qaRequest<TResp = unknown, TData = unknown>(
    payload: QuantumAuthExtensionPayload<TData>,
    timeoutMs = 15000
): Promise<TResp> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("qaRequest must be called in a browser context"));
    }

    return new Promise<TResp>((resolve, reject) => {
        const correlationId =
            (window.crypto as Crypto | undefined)?.randomUUID?.() ??
            `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const timer = setTimeout(() => {
            window.removeEventListener("message", onMessage);
            reject(new Error("QuantumAuth extension timeout"));
        }, timeoutMs);

        function onMessage(event: MessageEvent) {
            const msg = event.data;

            if (!msg || msg.type !== "QUANTUMAUTH_RESPONSE" || msg.correlationId !== correlationId) {
                return;
            }

            clearTimeout(timer);
            window.removeEventListener("message", onMessage);

            const p = msg.payload as any;

            const deepError = p?.error ?? p?.data?.error ?? p?.data?.message;

            const isOk =
                msg.error == null &&
                p?.ok !== false &&
                p?.data?.ok !== false;

            if (!isOk) {
                reject(new Error(msg.error || deepError || "QuantumAuth extension error"));
                return;
            }

            resolve(p?.data as TResp);
        }

        window.addEventListener("message", onMessage);

        window.postMessage(
            { type: "QUANTUMAUTH_REQUEST", correlationId, payload },
            "*",
        );
    });
}


// Public helper: detect whether the QuantumAuth extension is available.
// Uses a small "ping" request and caches the result.
export async function isQuantumAuthExtensionAvailable(timeoutMs = 1000): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // only short-circuit on true
    if (cachedExtensionAvailable === true) return true;

    try {
        await qaRequest({ action: "ping" }, timeoutMs);
        cachedExtensionAvailable = true;
        return true;
    } catch {
        // do NOT cache false
        return false;
    }
}
