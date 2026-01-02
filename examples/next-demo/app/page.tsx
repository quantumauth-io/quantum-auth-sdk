"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
    useAccount,
    useBalance,
    useChainId,
    useSendTransaction,
    useSignMessage,
    useSignTypedData,
} from "wagmi";
import { formatUnits, parseEther } from "viem";

import { QuantumAuthWebClient } from "@quantumauth/web";

const qaClient = new QuantumAuthWebClient({
    backendBaseUrl: "http://localhost:4000",
    appId: "next-demo",
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

export default function HomePage() {
    const [qaResult, setQaResult] = useState<string>("");
    const [sigResult, setSigResult] = useState<string>("");

    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const bal = useBalance({ address });

    const { sendTransaction, isPending } = useSendTransaction();
    const { signMessageAsync, isPending: isSigning } = useSignMessage();

    // ✅ Typed data (EIP-712 / v4)
    const { signTypedDataAsync, isPending: isSigningTyped } = useSignTypedData();

    const sendTx = () => {
        sendTransaction({
            to: address!, // send to self (safe)
            value: parseEther("0.001"),
        });
    };

    async function signDemoMessage() {
        if (!address) return;
        setSigResult("");

        const msg =
            `QuantumAuth personal_sign demo\n` +
            `origin=${typeof window !== "undefined" ? window.location.origin : "unknown"}\n` +
            `address=${address}\n` +
            `time=${new Date().toISOString()}\n` +
            `nonce=${crypto.randomUUID()}`;

        try {
            const sig = await signMessageAsync({ message: msg });
            setSigResult(`signature=${sig}\n\nmessage=\n${msg}`);
        } catch (err) {
            setSigResult("error: " + toErrorMessage(err));
        }
    }

    async function signTypedDataV4Demo() {
        if (!address) return;
        setSigResult("");

        // Keep it deterministic + obvious in your approval UI
        const nonce = crypto.randomUUID();
        const origin = typeof window !== "undefined" ? window.location.origin : "unknown";

        try {
            const sig = await signTypedDataAsync({
                domain: {
                    name: "QuantumAuth TypedData Demo",
                    version: "1",
                    chainId: BigInt(chainId),
                    verifyingContract: "0x0000000000000000000000000000000000000000", // demo-only
                },
                types: {
                    // EIP712Domain is optional in many libs, but harmless if included
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
                account: address, // helps some connectors
            });

            const typedDataShown = {
                domain: {
                    name: "QuantumAuth TypedData Demo",
                    version: "1",
                    chainId,
                    verifyingContract: "0x0000000000000000000000000000000000000000",
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

            setSigResult(`signature=${sig}\n\ntypedData=\n${JSON.stringify(typedDataShown, null, 2)}`);
        } catch (err) {
            setSigResult("error: " + toErrorMessage(err));
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
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>QuantumAuth × RainbowKit Demo</h1>

            <ConnectButton />

            <pre style={{ marginTop: 20, maxWidth: 820, width: "100%", overflowX: "auto" }}>
        {JSON.stringify(
            {
                isConnected,
                address,
                chainId,
                balanceStatus: bal.status,
                balanceError: bal.error?.message,
                balanceValue: bal.data?.value?.toString(),
                balanceFormatted: bal.data ? formatUnits(bal.data.value, bal.data.decimals) : null,
            },
            null,
            2
        )}
      </pre>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <button onClick={sendTx} disabled={!address || isPending} style={{ padding: "10px 14px" }}>
                    {isPending ? "Sending…" : "Send 0.001 ETH (self)"}
                </button>

                <button onClick={signDemoMessage} disabled={!address || isSigning} style={{ padding: "10px 14px" }}>
                    {isSigning ? "Signing…" : "Personal Sign (demo message)"}
                </button>

                {/* ✅ NEW */}
                <button
                    onClick={signTypedDataV4Demo}
                    disabled={!address || isSigningTyped}
                    style={{ padding: "10px 14px" }}
                >
                    {isSigningTyped ? "Signing…" : "Sign Typed Data (v4 demo)"}
                </button>

                <button onClick={callProtectedDemo} style={{ padding: "10px 14px" }}>
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
