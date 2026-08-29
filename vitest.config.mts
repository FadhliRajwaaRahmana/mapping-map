import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": rootDir } },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // All test files share the single ./vitest.db file DB (created+migrated in
    // vitest.setup.ts). Run files serially so a second worker can't rmSync the
    // DB out from under the first. Suite is small — parallelism buys nothing.
    fileParallelism: false,
  },
});
