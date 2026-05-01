// Vitest globalSetup hook — runs once before/after the entire test run.
// Returns a teardown function that closes the shared MariaDB pool.
// Per-file pool.end() would close the pool for files that haven't run yet.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default async function setup() {
  // No global setup needed; per-file beforeAll handles seeding.
  return async function teardown() {
    process.env.DB_NAME = process.env.DB_NAME || "tutorconnect_test";
    const pool = require("../config/db");
    await pool.end();
  };
}
