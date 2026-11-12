import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  // Read the D1 migrations in Node, hand them to the Workers runtime as a binding,
  // and apply them in test/apply-migrations.ts, so tests run against the real schema.
  const migrations = await readD1Migrations("./migrations");

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      coverage: {
        // V8 coverage doesn't work inside the Workers runtime; Istanbul does.
        provider: "istanbul" as const,
        include: ["src/**/*.ts"],
        // Not counted: generated files, and the browser entry scripts, which
        // only wire the DOM and are exercised by Playwright (note 0012).
        exclude: [
          "src/worker-configuration.d.ts",
          "src/worker/client-scripts.generated.ts",
          "src/worker/share-card.generated.ts",
          "src/client/entries/**",
        ],
        reporter: ["text", "html", "json-summary"],
        thresholds: {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
    },
  };
});
