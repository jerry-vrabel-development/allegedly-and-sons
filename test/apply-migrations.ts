import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

/** The test-only binding vitest.config.ts adds: the D1 migrations, read in Node. */
const testEnv = env as typeof env & { readonly TEST_MIGRATIONS: D1Migration[] };

// Runs before each test file. Already-applied migrations are skipped.
await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
