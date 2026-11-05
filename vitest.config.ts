import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      // V8 coverage doesn't work inside the Workers runtime; Istanbul does.
      provider: "istanbul",
      include: ["src/**/*.ts"],
      exclude: ["src/worker-configuration.d.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
