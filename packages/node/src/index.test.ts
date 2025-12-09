import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from "vitest";
import * as NodeSdk from "./index";
import {
    joinUrl,
    verifyRequestWithServer,
    createExpressQuantumAuthMiddleware,
} from "./index";
import type {
    QuantumAuthNodeConfig,
    VerificationRequestPayload,
    VerificationResponse,
} from "./index";


function createMockResponse() {
    return {
        statusCode: 200,
        body: undefined as any,
        headers: {} as Record<string, string>,

        status(code: number) {
            this.statusCode = code;
            return this;
        },

        json(payload: any) {
            this.body = payload;
            return this;
        },

        setHeader(name: string, value: string) {
            this.headers[name] = value;
            return this;
        },
    };
}
//
// joinUrl tests
//

describe("joinUrl", () => {
    it("joins without extra slash", () => {
        const url = joinUrl("https://api.example.com", "verify");
        expect(url).toBe("https://api.example.com/verify");
    });

    it("does not double slash", () => {
        const url = joinUrl("https://api.example.com/", "/verify");
        expect(url).toBe("https://api.example.com/verify");
    });

    it("handles mixed trailing/leading slashes without duplication", () => {
        expect(
            joinUrl("https://api.example.com/", "verify"),
        ).toBe("https://api.example.com/verify");

        expect(
            joinUrl("https://api.example.com", "/verify"),
        ).toBe("https://api.example.com/verify");
    });
});

//
// verifyRequestWithServer tests (using fetch mock directly)
//

const originalFetch = globalThis.fetch;

function mockFetchOnce(body: unknown, opts?: { ok?: boolean; status?: number; statusText?: string }) {
    const { ok = true, status = 200, statusText = "OK" } = opts ?? {};
    const fetchMock = vi.fn(async () => ({
        ok,
        status,
        statusText,
        text: async () => (body === undefined ? "" : JSON.stringify(body)),
    }));
    (globalThis as any).fetch = fetchMock as any;
    return fetchMock;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    globalThis.fetch = originalFetch!;
});

describe("verifyRequestWithServer", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        // restore real fetch & timers
        globalThis.fetch = originalFetch!;
        vi.useRealTimers();
    });

    it("aborts the request when timeout elapses", async () => {
        vi.useFakeTimers();

        // mock fetch so it rejects when the signal is aborted
        const fetchMock = vi.fn(
            (_input: any, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    const signal = init?.signal as AbortSignal | undefined;
                    if (signal) {
                        signal.addEventListener("abort", () => {
                            reject(new Error("Aborted"));
                        });
                    }
                }),
        );

        globalThis.fetch = fetchMock;

        const cfg: QuantumAuthNodeConfig = { timeoutMs: 10 };
        const payload: VerificationRequestPayload = {
            method: "GET",
            path: "/timeout",
            headers: {},
        };

        const promise = verifyRequestWithServer(cfg, payload);

        // let the internal timeout fire
        vi.advanceTimersByTime(11);

        const result = await promise;

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.authenticated).toBe(false);
        expect(result.error).toBe("Aborted");
    });



    it("returns authenticated response on success", async () => {
        const responseBody = {
            authenticated: true,
            user_id: "user-123",
            payload: { foo: "bar" },
        };

        const fetchMock = mockFetchOnce(responseBody);

        const cfg: QuantumAuthNodeConfig = {
            backendApiKey: "secret-key",
        };

        const payload: VerificationRequestPayload = {
            method: "POST",
            path: "/verify",
            headers: { Authorization: "Bearer token" },
        };

        const result = await verifyRequestWithServer(cfg, payload);

        expect(result).toEqual<VerificationResponse>({
            authenticated: true,
            userId: "user-123",
            payload: { foo: "bar" },
            error: undefined,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] =
            fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(typeof url).toBe("string");
        expect(init.headers).toMatchObject({
            "Content-Type": "application/json",
            "X-QuantumAuth-Backend-Key": "secret-key",
        });
        expect(init.body).toBe(JSON.stringify(payload));
    });

    it("returns formatted error when server responds non-ok without error field", async () => {
        const fetchMock = mockFetchOnce({}, {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
        });

        const cfg: QuantumAuthNodeConfig = {};
        const payload: VerificationRequestPayload = {
            method: "GET",
            path: "/health",
            headers: {},
        };

        const result = await verifyRequestWithServer(cfg, payload);

        expect(result.authenticated).toBe(false);
        expect(result.error).toContain("HTTP 500");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns error when fetch throws", async () => {
        const fetchMock = vi.fn(async () => {
            throw new Error("network down");
        });
        (globalThis as any).fetch = fetchMock as any;

        const cfg: QuantumAuthNodeConfig = {};
        const payload: VerificationRequestPayload = {
            method: "POST",
            path: "/verify",
            headers: {},
        };

        const result = await verifyRequestWithServer(cfg, payload);

        expect(result.authenticated).toBe(false);
        expect(result.error).toBe("network down");
    });
    it("adds backendApiKey header and accepts payload from data field", async () => {
        const cfg: QuantumAuthNodeConfig = {
            backendApiKey: "secret-key",
            timeoutMs: 5000,
        };

        const payload: VerificationRequestPayload = {
            method: "POST",
            path: "/verify",
            headers: { "X-Test": "1" },
        };

        const responseBody = JSON.stringify({
            authenticated: true,
            user_id: "user-123",
            data: { foo: "bar" },
        });

        const mockFetch = vi.fn().mockResolvedValue(
            new Response(responseBody, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mockFetch;

        try {
            const result = await verifyRequestWithServer(cfg, payload);

            expect(result).toEqual({
                authenticated: true,
                userId: "user-123",
                payload: { foo: "bar" },
                error: undefined,
            });

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];

            expect(init.headers).toMatchObject({
                "Content-Type": "application/json",
                "X-QuantumAuth-Backend-Key": "secret-key",
            });
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it("handles ok response with non-JSON body without throwing", async () => {
        const cfg: QuantumAuthNodeConfig = {
            timeoutMs: 3000,
        };

        const payload: VerificationRequestPayload = {
            method: "GET",
            path: "/verify",
            headers: {},
        };

        const mockFetch = vi.fn().mockResolvedValue(
            new Response("not-json-at-all", {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            }),
        );

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mockFetch;

        try {
            const result = await verifyRequestWithServer(cfg, payload);

            // JSON parse fails -> json=null -> authenticated false, no user/payload, no error
            expect(result).toEqual({
                authenticated: false,
                userId: undefined,
                payload: undefined,
                error: undefined,
            });
        } finally {
            globalThis.fetch = originalFetch;
        }
    });


});

//
// Middleware tests
//

type MockRes = {
    statusCode?: number;
    body?: unknown;
    status: (code: number) => MockRes;
    json: (body: unknown) => MockRes;
};


// helper: mock QA server response via fetch and capture verify payload
function mockVerifyFromMiddleware(result: VerificationResponse, capture: { payload?: VerificationRequestPayload }) {
    const fetchMock = vi.fn(async (_url: string, init: any) => {
        const textBody = String(init?.body ?? "");
        capture.payload = textBody
            ? (JSON.parse(textBody) as VerificationRequestPayload)
            : undefined;

        const wireBody: any = {
            authenticated: result.authenticated,
            user_id: result.userId,
        };
        if (result.payload !== undefined) wireBody.payload = result.payload;
        if (result.error) wireBody.error = result.error;

        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () => JSON.stringify(wireBody),
        };
    });

    (globalThis as any).fetch = fetchMock as any;
    return fetchMock;
}

describe("createExpressQuantumAuthMiddleware", () => {
    const makeRes = () => {
        const res: any = {
            statusCode: 200,
            body: undefined as unknown,
            status(code: number) {
                this.statusCode = code;
                return this;
            },
            json(payload: unknown) {
                this.body = payload;
                return this;
            },
        };
        return res;
    };
    it("returns 500 when middleware throws", async () => {
        const middleware = createExpressQuantumAuthMiddleware({});

        // Reading `body` will throw, so the middleware's try block fails
        const req = {
            method: "POST",
            originalUrl: "/qa/demo",
            headers: {},
            get body() {
                throw new Error("boom");
            },
        } as any;

        const res = createMockResponse();
        const next = vi.fn();

        await middleware(req, res as any, next as any);

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({
            error: "QuantumAuth middleware error: boom",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 when body is missing", async () => {
        const cfg: QuantumAuthNodeConfig = {};
        const middleware = createExpressQuantumAuthMiddleware(cfg);

        const req: any = {
            body: null,
            method: "POST",
            originalUrl: "/qa/demo",
            headers: {},
        };

        const res = createMockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next as any);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            error: "Missing request body for QuantumAuth",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("filters headers and populates context on success", async () => {
        const cfg: QuantumAuthNodeConfig = {};

        const capture: { payload?: VerificationRequestPayload } = {};
        mockVerifyFromMiddleware(
            {
                authenticated: true,
                userId: "user-123",
                payload: { ping: "pong" },
            },
            capture,
        );

        const middleware = createExpressQuantumAuthMiddleware(cfg);

        const req: any = {
            body: { encrypted: "ciphertext" },
            method: "POST",
            originalUrl: "/qa/demo",
            headers: {
                Authorization: "Bearer token",
                "x-quantumauth-something": "value",
                "x-qa-signature": "sig",
                "content-type": "application/json",
            },
        };

        const res = createMockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next as any);

        // verify headers sent to QA server
        expect(capture.payload).toBeDefined();
        expect(capture.payload).toMatchObject({
            method: "POST",
            path: "/qa/demo",
        });
        expect(capture.payload!.headers).toEqual({
            Authorization: "Bearer token",
            "x-quantumauth-something": "value",
            "x-qa-signature": "sig",
        });

        // verify request context
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.userId).toBe("user-123");
        expect(req.quantumAuth).toEqual({
            userId: "user-123",
            payload: { ping: "pong" },
        });
        expect(req.qa).toEqual(req.quantumAuth);
        expect(req.body).toEqual({ ping: "pong" });
    });

    it("returns 401 when not authenticated or no userId", async () => {
        const cfg: QuantumAuthNodeConfig = {};

        const capture: { payload?: VerificationRequestPayload } = {};
        mockVerifyFromMiddleware(
            {
                authenticated: false,
                userId: undefined,
                payload: undefined,
                error: "invalid",
            },
            capture,
        );

        const middleware = createExpressQuantumAuthMiddleware(cfg);

        const req: any = {
            body: { encrypted: "ciphertext" },
            method: "POST",
            originalUrl: "/qa/demo",
            headers: {},
        };

        const res = createMockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next as any);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: "QuantumAuth authentication failed",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("leaves body unchanged when payload is undefined", async () => {
        const cfg: QuantumAuthNodeConfig = {};

        const capture: { payload?: VerificationRequestPayload } = {};
        mockVerifyFromMiddleware(
            {
                authenticated: true,
                userId: "user-123",
                payload: undefined,
            },
            capture,
        );

        const middleware = createExpressQuantumAuthMiddleware(cfg);

        const originalBody = { encrypted: "ciphertext" };

        const req: any = {
            body: originalBody,
            method: "POST",
            originalUrl: "/qa/demo",
            headers: {},
        };

        const res = createMockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next as any);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body).toBe(originalBody);
    });
});
