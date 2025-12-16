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
        return Promise.reject(
            new Error("qaRequest must be called in a browser context"),
        );
    }

    return new Promise<TResp>((resolve, reject) => {
        // Fallback if crypto.randomUUID is not available
        const correlationId =
            (window.crypto as Crypto | undefined)?.randomUUID?.() ??
            `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const timer = setTimeout(() => {
            window.removeEventListener("message", onMessage);
            reject(new Error("QuantumAuth extension timeout"));
        }, timeoutMs);

        function onMessage(event: MessageEvent) {
            const msg = event.data;
            console.log("Received response from QuantumAuth extension:", msg);
            if (
                !msg ||
                msg.type !== "QUANTUMAUTH_RESPONSE" ||
                msg.correlationId !== correlationId
            ) {
                return;
            }

            clearTimeout(timer);
            window.removeEventListener("message", onMessage);

            if (msg.error || msg.payload?.ok === false) {
                reject(
                    new Error(
                        msg.error || msg.payload?.error || "QuantumAuth extension error",
                    ),
                );
            } else {
                resolve(msg.payload?.data as TResp);
            }
        }

        window.addEventListener("message", onMessage);

        console.log("Sending request to QuantumAuth extension:", payload);

        window.postMessage(
            {
                type: "QUANTUMAUTH_REQUEST",
                correlationId,
                payload,
            },
            "*",
        );
    });
}

// Public helper: detect whether the QuantumAuth extension is available.
// Uses a small "ping" request and caches the result.
export async function isQuantumAuthExtensionAvailable(
    timeoutMs = 1000,
): Promise<boolean> {
    if (typeof window === "undefined") {
        return false;
    }

    if (cachedExtensionAvailable !== null) {
        return cachedExtensionAvailable;
    }

    try {
        await qaRequest<{ message?: string }, void>(
            { action: "ping" },
            timeoutMs,
        );
        cachedExtensionAvailable = true;
    } catch {
        cachedExtensionAvailable = false;
    }

    return cachedExtensionAvailable;
}