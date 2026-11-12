// @ts-check
import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "node_modules/",
    ".wrangler/",
    "coverage/",
    "dist/",
    "playwright-report/",
    "test-results/",
    "src/worker-configuration.d.ts",
    "src/worker/client-scripts.generated.ts",
    "src/worker/share-card.generated.ts",
  ]),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.js",
            "vitest.config.ts",
            "playwright.config.ts",
            "scripts/build-client.js",
          ],
          // Config files outside src/ and test/ are linted with Node's types. Without
          // this, playwright.config.ts got no `process` type unless the e2e project
          // happened to load first, so lint failed intermittently.
          defaultProject: "./e2e/tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Build scripts run in Node.
    files: ["scripts/**/*.js"],
    languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly" } },
  },
);
