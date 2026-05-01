import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The integration tests share a single MariaDB test database and each
    // file resets it in beforeAll. Running files in parallel would race on
    // the DB. Force a single worker.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    globalSetup: "./tests/teardown.mjs",
  },
});
