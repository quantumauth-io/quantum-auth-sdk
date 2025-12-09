// eslint.config.mjs
// ESLint 9 flat config for QuantumAuth monorepo

import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default tseslint.config(
    // 1) global ignores: no build artifacts / node_modules
    {
        ignores: [
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
            "**/.next/**",
            "node_modules/**",
            ".changeset/**"
        ],
    },

    // 2) base TS/JS recommended rules
    ...tseslint.configs.recommended,

    // 3) our overrides
    {
        files: ["**/*.{ts,tsx,js,jsx}"],

        rules: {
            "no-console": "off",

            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-require-imports": "off",
        },
    }
);
