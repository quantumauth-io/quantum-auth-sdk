import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from "vitest";
import type { Mock } from "vitest";

// mock the extension bridge BEFORE importing the client
vi.mock("./extensionBridge", () => ({
    isQuantumAuthExtensionAvailable: vi.fn(),
    qaRequest: vi.fn(),
}));

import { QuantumAuthWebClient } from "./index";
import {
    isQuantumAuthExtensionAvailable,
    qaRequest,
} from "./extensionBridge";

type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;


const isExtMock = isQuantumAuthExtensionAvailable as unknown as Mock<() => Promise<boolean>>;

const qaRequestMock = qaRequest as unknown as Mock<(input: unknown) => Promise<unknown>>;


const originalFetch = globalThis.fetch;

beforeEach(() => {
    isExtMock.mockReset();
    qaRequestMock.mockReset();
    vi.restoreAllMocks();
});

afterEach(() => {
    if (originalFetch) {
        globalThis.fetch = originalFetch;
    } else {
        // @ts-expect-error — allow cleanup in older runtimes
        delete globalThis.fetch;
    }
    // @ts-expect-error — test-only cleanup
    delete globalThis.window;
});

describe("QuantumAuthWebClient.requestChallenge error paths", () => {
    it("throws if called without window (SSR environment)", async () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.example.com",
        });

        const hadWindow = "window" in globalThis;
        const originalWindow = (globalThis as any).window;

        if (hadWindow) {
            delete (globalThis as any).window;
        }

        try {
            await expect(
                client["requestChallenge"]({
                    method: "GET",
                    path: "/qa/demo",
                    backendHost: "api.example.com",
                }),
            ).rejects.toThrow(
                "QuantumAuthWebClient.requestChallenge must run in a browser",
            );
        } finally {
            if (hadWindow) {
                (globalThis as any).window = originalWindow;
            } else {
                // ensure it's really absent after test
                delete (globalThis as any).window;
            }
        }
    });
    it("throws if QuantumAuth browser extension is not detected", async () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.example.com",
        });

        // Ensure window exists for this test
        (globalThis as any).window = (globalThis as any).window ?? {};

        (isQuantumAuthExtensionAvailable as unknown as Mock).mockResolvedValueOnce(false);

        await expect(

            client["requestChallenge"]({
                method: "POST",
                path: "/qa/demo",
                backendHost: "api.example.com",
            }),
        ).rejects.toThrow(
            "QuantumAuth browser extension not detected. Please install the QuantumAuth extension to use protected requests.",
        );
    });
});


describe("QuantumAuthWebClient.extractHost", () => {
    it("extracts host from full URL", () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const host = (client as any)["extractHost"](
            "https://api.quantumauth.io/v1/verify",
        );
        expect(host).toBe("api.quantumauth.io");
    });

    it("handles bare host", () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const host = (client as any)["extractHost"]("api.quantumauth.io/v1/verify");
        expect(host).toBe("api.quantumauth.io");
    });

    it("falls back gracefully on malformed URLs", () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const host = (client as any)["extractHost"]("not-a-url//with/path");
        expect(host).toBe("not-a-url");
    });
});

describe("QuantumAuthWebClient constructor", () => {
    it("strips trailing slashes from backendBaseUrl", () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io///",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((client as any).backendBaseUrl).toBe("https://api.quantumauth.io");
    });
});

describe("QuantumAuthWebClient.requestChallenge", () => {
    it("throws when run outside a browser (no window)", async () => {
        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
        });

        // make sure window is really undefined
        // @ts-expect-error — test-only delete
        delete globalThis.window;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestChallenge = (client as any).requestChallenge.bind(client);

        await expect(
            requestChallenge({
                method: "POST",
                path: "/qa/demo",
                backendHost: "api.quantumauth.io",
            }),
        ).rejects.toThrow(
            "QuantumAuthWebClient.requestChallenge must run in a browser",
        );
    });

    it("throws when QuantumAuth extension is not available", async () => {
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(false);

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestChallenge = (client as any).requestChallenge.bind(client);

        await expect(
            requestChallenge({
                method: "POST",
                path: "/qa/demo",
                backendHost: "api.quantumauth.io",
            }),
        ).rejects.toThrow("QuantumAuth browser extension not detected");
        expect(isExtMock).toHaveBeenCalledTimes(1);
        expect(qaRequestMock).not.toHaveBeenCalled();
    });

    it("uses qaProof from top-level response", async () => {
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(true);
        qaRequestMock.mockResolvedValue({
            qaProof: {
                "X-QuantumAuth-Signature": "sig-top",
            },
        });

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
            appId: "my-app",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestChallenge = (client as any).requestChallenge.bind(client);

        const result = await requestChallenge({
            method: "POST",
            path: "/qa/demo",
            backendHost: "api.quantumauth.io",
        });

        expect(isExtMock).toHaveBeenCalledTimes(1);
        expect(qaRequestMock).toHaveBeenCalledTimes(1);
        expect(result.qaProof).toEqual({
            "X-QuantumAuth-Signature": "sig-top",
        });

        const callArg = qaRequestMock.mock.calls[0][0] as {
            action: string;
            data: Record<string, unknown>;
        };
        expect(callArg.action).toBe("request_challenge");
        expect(callArg.data).toMatchObject({
            method: "POST",
            path: "/qa/demo",
            backendHost: "api.quantumauth.io",
            appId: "my-app",
        });
    });

    it("falls back to data.qaProof when top-level qaProof missing", async () => {
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(true);
        qaRequestMock.mockResolvedValue({
            data: {
                qaProof: {
                    "X-QuantumAuth-Signature": "sig-nested",
                },
            },
        });

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestChallenge = (client as any).requestChallenge.bind(client);

        const result = await requestChallenge({
            method: "GET",
            path: "/qa/demo",
            backendHost: "api.quantumauth.io",
        });

        expect(result.qaProof).toEqual({
            "X-QuantumAuth-Signature": "sig-nested",
        });
    });

    it("returns empty proof object when none provided", async () => {
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(true);
        qaRequestMock.mockResolvedValue({});

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://api.quantumauth.io",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestChallenge = (client as any).requestChallenge.bind(client);

        const result = await requestChallenge({
            method: "GET",
            path: "/qa/demo",
            backendHost: "api.quantumauth.io",
        });

        expect(result.qaProof).toEqual({});
    });
});

describe("QuantumAuthWebClient.request", () => {
    it("performs a protected POST request and parses JSON", async () => {
        // browser + extension
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(true);
        qaRequestMock.mockResolvedValue({
            qaProof: {
                "X-QuantumAuth-Signature": "sig-123",
            },
        });

        // mock fetch
        const fetchMock = vi.fn<FetchMock["mockImplementation"]>() as unknown as FetchMock;
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ ok: true, msg: "hello" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://backend.quantumauth.io/",
        });

        const result = await client.request<{ ok: boolean; msg: string }>({
            method: "POST",
            path: "/qa/demo",
            body: { ping: "hello" },
        });

        expect(isExtMock).toHaveBeenCalledTimes(1);
        expect(qaRequestMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

        expect(url).toBe("https://backend.quantumauth.io/qa/demo");
        expect(init.method).toBe("POST");

        const headers = init.headers as Headers;
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("X-QuantumAuth-Signature")).toBe("sig-123");

        expect(init.body).toBe(JSON.stringify({ ping: "hello" }));

        expect(result.ok).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ ok: true, msg: "hello" });
    });

    it("omits body for GET requests", async () => {
        // @ts-expect-error — test-only window stub
        globalThis.window = {} as Window;
        isExtMock.mockResolvedValue(true);
        qaRequestMock.mockResolvedValue({ qaProof: {} });

        const fetchMock = vi.fn<FetchMock["mockImplementation"]>() as unknown as FetchMock;
        fetchMock.mockResolvedValue(
            new Response("plain text response", {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            }),
        );
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new QuantumAuthWebClient({
            backendBaseUrl: "https://backend.quantumauth.io",
        });

        const result = await client.request({
            method: "GET",
            path: "/qa/demo",
        });

        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe("GET");
        expect(init.body).toBeUndefined();

        // non-JSON body => data null
        expect(result.data).toBeNull();
    });
});
