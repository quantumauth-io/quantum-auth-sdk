"use client";

import { useState } from "react";
import {
    QuantumAuthWebClient,
} from "@quantumauth/web";

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


    async function callProtectedDemo() {
        try {
            const res = await qaClient.request<DemoResponse>({
                method: "POST",
                path: "/qa/demo", // Express demo route
                body: { ping: "hello from next demo" },
            });

            setQaResult(
                `status=${res.status} body=${JSON.stringify(res.data, null, 2)}`
            );
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
            }}
        >
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>QuantumAuth Client demo</h1>




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
