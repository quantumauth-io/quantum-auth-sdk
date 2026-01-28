"use client";

import { useEffect, useMemo, useState } from "react";
import { QAConnectButton, useQA } from "@quantumauth/privacy-connector/react";
import { QuantumAuthWebClient } from "@quantumauth/web";

const qaClient = new QuantumAuthWebClient({
    backendBaseUrl: "http://node.dev.local:4000",
    appId: "3f0600f8-b915-4d60-b859-38d77b2511f7",
});

type DemoResponse = {
    userId?: string;
    body: {
        ping: string;
    };
};

export function toErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/** minimal helpers (no wagmi/viem) */
const WEI_PER_ETH = 10n ** 18n;

function toHex(n: bigint): `0x${string}` {
    return `0x${n.toString(16)}` as const;
}

/** supports strings like "0.001", "1", "0.1" (18 decimals) */
function parseEther(value: string): bigint {
    const [whole = "0", frac = ""] = value.split(".");
    const wholeWei = BigInt(whole || "0") * WEI_PER_ETH;

    const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
    const fracWei = BigInt(fracPadded || "0");

    return wholeWei + fracWei;
}

function formatEther(wei: bigint): string {
    const sign = wei < 0n ? "-" : "";
    const v = wei < 0n ? -wei : wei;

    const whole = v / WEI_PER_ETH;
    const frac = v % WEI_PER_ETH;

    // show up to 6 decimals, trim trailing zeros
    const fracStr = frac.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
    return fracStr ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

export default function HomePage() {
    const [qaResult, setQaResult] = useState<string>("");
    const [sigResult, setSigResult] = useState<string>("");
    const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
    const [balanceStatus, setBalanceStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [balanceError, setBalanceError] = useState<string | undefined>(undefined);

    const [isSending, setIsSending] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [isSigningTyped, setIsSigningTyped] = useState(false);

    // ⬇️ From your connector
    const qa = useQA();

    // Adjust these names if your hook differs
    const isReady = (qa as any).isReady ?? true;
    const isConnected = (qa as any).isConnected ?? false;
    const address: string | undefined = (qa as any).address;
    const chainId: number | undefined = (qa as any).chainId;
    const provider = (qa as any).provider ?? (qa as any).eip1193Provider;

    const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : "unknown"), []);

    // Fetch balance whenever connected/address changes
    useEffect(() => {
        let cancelled = false;

        async function run() {
            setBalanceWei(null);
            setBalanceError(undefined);

            if (!provider?.request || !address) {
                setBalanceStatus("idle");
                return;
            }

            setBalanceStatus("loading");
            try {
                const hexBal = (await provider.request({
                    method: "eth_getBalance",
                    params: [address, "latest"],
                })) as string;

                const wei = BigInt(hexBal);
                if (!cancelled) {
                    setBalanceWei(wei);
                    setBalanceStatus("success");
                }
            } catch (err) {
                if (!cancelled) {
                    setBalanceStatus("error");
                    setBalanceError(toErrorMessage(err));
                }
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [provider, address]);

    const sendTx = async () => {
        if (!provider?.request || !address) return;
        setIsSending(true);
        try {
            // send to self (safe)
            const valueWei = parseEther("0.001");
            const txHash = (await provider.request({
                method: "eth_sendTransaction",
                params: [
                    {
                        from: address,
                        to: address,
                        value: toHex(valueWei),
                    },
                ],
            })) as string;

            setSigResult(`txHash=${txHash}`);
        } catch (err) {
            setSigResult("error: " + toErrorMessage(err));
        } finally {
            setIsSending(false);
        }
    };

    async function signDemoMessage() {
        if (!provider?.request || !address) return;
        setIsSigning(true);
        setSigResult("");

        const msg =
            `QuantumAuth personal_sign demo\n` +
            `origin=${origin}\n` +
            `address=${address}\n` +
            `time=${new Date().toISOString()}\n` +
            `nonce=${crypto.randomUUID()}`;

        try {
            // MetaMask-style: personal_sign([message, address])
            const sig = (await provider.request({
                method: "personal_sign",
                params: [msg, address],
            })) as string;

            setSigResult(`signature=${sig}\n\nmessage=\n${msg}`);
        } catch (err) {
            setSigResult("error: " + toErrorMessage(err));
        } finally {
            setIsSigning(false);
        }
    }

    async function signTypedDataV4Demo() {
        if (!provider?.request || !address) return;
        setIsSigningTyped(true);
        setSigResult("");

        const nonce = crypto.randomUUID();

        const typedData = {
            domain: {
                name: "QuantumAuth TypedData Demo",
                version: "1",
                chainId: chainId ?? 1,
                verifyingContract: "0x0000000000000000000000000000000000000000", // demo-only
            },
            types: {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" },
                ],
                Demo: [
                    { name: "contents", type: "string" },
                    { name: "origin", type: "string" },
                    { name: "account", type: "address" },
                    { name: "nonce", type: "string" },
                    { name: "timestamp", type: "string" },
                ],
            },
            primaryType: "Demo",
            message: {
                contents: "QuantumAuth eth_signTypedData_v4 demo",
                origin,
                account: address,
                nonce,
                timestamp: new Date().toISOString(),
            },
        };

        try {
            const sig = (await provider.request({
                method: "eth_signTypedData_v4",
                params: [address, JSON.stringify(typedData)],
            })) as string;

            setSigResult(`signature=${sig}\n\ntypedData=\n${JSON.stringify(typedData, null, 2)}`);
        } catch (err) {
            setSigResult("error: " + toErrorMessage(err));
        } finally {
            setIsSigningTyped(false);
        }
    }

    async function callProtectedDemo() {
        try {
            const res = await qaClient.request<DemoResponse>({
                method: "POST",
                path: "/qa/demo",
                body: { ping: "hello from next demo" },
            });

            setQaResult(`status=${res.status} body=${JSON.stringify(res.data, null, 2)}`);
        } catch (err) {
            setQaResult("error: " + toErrorMessage(err));
        }
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                fontFamily: "system-ui, sans-serif",
                background: "#0a0a0a",
                color: "#e5e7eb",
                padding: 24,
            }}
        >
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>QuantumAuth Demo (Privacy Connector)</h1>

            {/* replaces RainbowKit ConnectButton */}
            <QAConnectButton />

            <pre style={{ marginTop: 20, maxWidth: 820, width: "100%", overflowX: "auto" }}>
        {JSON.stringify(
            {
                isReady,
                isConnected,
                address,
                chainId,
                balanceStatus,
                balanceError,
                balanceWei: balanceWei?.toString() ?? null,
                balanceEth: balanceWei != null ? formatEther(balanceWei) : null,
            },
            null,
            2
        )}
      </pre>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <button onClick={() => void sendTx()} disabled={!address || isSending} style={{ padding: "10px 14px" }}>
                    {isSending ? "Sending…" : "Send 0.001 ETH (self)"}
                </button>

                <button onClick={() => void signDemoMessage()} disabled={!address || isSigning} style={{ padding: "10px 14px" }}>
                    {isSigning ? "Signing…" : "Personal Sign (demo message)"}
                </button>

                <button
                    onClick={() => void signTypedDataV4Demo()}
                    disabled={!address || isSigningTyped}
                    style={{ padding: "10px 14px" }}
                >
                    {isSigningTyped ? "Signing…" : "Sign Typed Data (v4 demo)"}
                </button>

                <button onClick={() => void callProtectedDemo()} style={{ padding: "10px 14px" }}>
                    Call QA-protected /qa/demo
                </button>
            </div>

            {sigResult && (
                <pre style={{ marginTop: 12, fontSize: 12, maxWidth: 820, width: "100%", overflowX: "auto" }}>
          {sigResult}
        </pre>
            )}

            {qaResult && (
                <pre style={{ marginTop: 12, fontSize: 12, maxWidth: 820, width: "100%", overflowX: "auto" }}>
          {qaResult}
        </pre>
            )}
        </main>
    );
}
