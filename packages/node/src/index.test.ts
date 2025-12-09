import { describe, it, expect } from "vitest";
import { joinUrl } from "./index";
import type { VerificationRequestPayload } from "./index";

describe("joinUrl", () => {
    it("joins without extra slash", () => {
        const url = joinUrl("https://api.example.com", "verify");
        expect(url).toBe("https://api.example.com/verify");
    });

    it("does not double slash", () => {
        const url = joinUrl("https://api.example.com/", "/verify");
        expect(url).toBe("https://api.example.com/verify");
    });
});
