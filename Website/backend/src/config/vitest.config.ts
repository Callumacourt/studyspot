import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/tests/**/*.ts"],
    exclude: ["src/tests/test.setup.ts", "src/tests/**/*.integration.test.ts"],
    setupFiles: ["./src/tests/test.setup.ts"],
  },
});