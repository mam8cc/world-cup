import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // A dummy URL so modules that build a (lazy, never-connected) DB client import cleanly.
    env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test" },
  },
});
