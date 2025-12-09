// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "packages/**/src/**/*.test.ts",
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "coverage",
            exclude: [
                "**/dist/**",
                "**/build/**",
                "**/examples/**",
                "**/*.d.ts",
            ],
        },
    },
});
