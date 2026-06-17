import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        includeSource: ["src/**/*.ts"],
        environment: "node",
        pool: "forks",
        setupFiles: ["./tests/setup.ts"],
        alias: {
            obsidian: fileURLToPath(new URL("./tests/stubs/obsidian.ts", import.meta.url)),
        },
        testTimeout: 15_000,
        hookTimeout: 30_000,
    },
});
