import { describe, it, expect } from "vitest";
import { QuantumAuthWebClient } from "./index";

describe("QuantumAuthWebClient.extractHost", () => {
    it("extracts host from full URL", () => {
        const client = new QuantumAuthWebClient({ backendBaseUrl: "https://api.quantumauth.io" });
        const host = client["extractHost"]("https://api.quantumauth.io/v1/verify");
        expect(host).toBe("api.quantumauth.io");
    });

    it("handles bare host", () => {
        const client = new QuantumAuthWebClient({ backendBaseUrl: "api.quantumauth.io" });
        const host = client["extractHost"]("api.quantumauth.io/v1/verify");
        expect(host).toBe("api.quantumauth.io");
    });
});
