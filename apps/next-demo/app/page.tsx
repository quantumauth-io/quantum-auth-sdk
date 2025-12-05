"use client";

import { useEffect, useState } from "react";
import {
    QuantumAuthWebClient,
    type PqKem,
    type PqKemAlg,
} from "@quantumauth/web";

type Status = "unknown" | "online" | "offline";

const QA_CLIENT_URL = "http://localhost:8090";

// stub PQ KEM, same as before
const pqKemStub: PqKem = {
    async importPublicKey(raw: Uint8Array, alg: PqKemAlg) {
        return { alg, raw };
    },
    async encapsulate() {
        return {
            sharedSecret: new Uint8Array(32),
            ciphertext: new Uint8Array(32),
        };
    },
};

const qaClient = new QuantumAuthWebClient({
    qaClientBaseUrl: "http://localhost:8090",
    backendBaseUrl: "http://localhost:4000",
    pqKemAlg: "ML-KEM-768",
    qaKemPublicKeyB64: "REPLACE_ME",
    pqKem: pqKemStub,
    appId: "next-demo",
});

export default function HomePage() {
    const [status, setStatus] = useState<Status>("unknown");
    const [message, setMessage] = useState<string>("");
    const [qaResult, setQaResult] = useState<string>("");

    async function checkHealth() {
        try {
            const res = await fetch(`${QA_CLIENT_URL}/api/health`, {
                cache: "no-store",
            });

            const text = await res.text();

            if (res.ok) {
                setStatus("online");
                setMessage(text || "OK");
            } else {
                setStatus("offline");
                setMessage(`HTTP ${res.status} ${text}`);
            }
        } catch (err: any) {
            setStatus("offline");
            setMessage(String(err?.message ?? err));
        }
    }

    async function callProtectedDemo() {
        try {
            const res = await qaClient.request<any, { ping: string }>({
                method: "POST",
                path: "/qa/demo", // Express demo route
                body: { ping: "hello from next demo" },
            });

            setQaResult(
                `status=${res.status} body=${JSON.stringify(res.data, null, 2)}`
            );
        } catch (err: any) {
            setQaResult(`error: ${String(err?.message ?? err)}`);
        }
    }

    useEffect(() => {
        // Check immediately
        checkHealth();

        // Then poll every 5 seconds
        const interval = setInterval(checkHealth, 5000);

        return () => clearInterval(interval);
    }, []);

    const color =
        status === "online"
            ? "#16a34a" // green
            : status === "offline"
                ? "#dc2626" // red
                : "#6b7280"; // gray

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
            }}
        >
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>QuantumAuth Client Status</h1>

            <div
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: "9999px",
                    backgroundColor: color,
                    boxShadow: `0 0 20px ${color}`,
                    transition: "background-color 0.3s, box-shadow 0.3s",
                }}
            />

            <p style={{ fontSize: 14 }}>
                Client on <code>{QA_CLIENT_URL}</code> is{" "}
                <strong style={{ textTransform: "uppercase" }}>{status}</strong>
            </p>

            {message && (
                <pre
                    style={{
                        marginTop: 12,
                        padding: 12,
                        background: "#111827",
                        borderRadius: 8,
                        border: "1px solid #1f2937",
                        maxWidth: 600,
                        whiteSpace: "pre-wrap",
                        fontSize: 12,
                    }}
                >
          {message}
        </pre>
            )}


            <button onClick={callProtectedDemo} style={{ marginTop: 24 }}>
                Call QA-protected /qa/demo
            </button>

            {qaResult && (
                <pre style={{ marginTop: 12, fontSize: 12 }}>
          {qaResult}
        </pre>
            )}
        </main>
    );
}
