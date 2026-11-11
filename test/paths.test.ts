/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import * as paths from "../src/core/paths";

/** Every source file's text, by path (Vite reads them at build time). */
const SOURCES = import.meta.glob<string>("../src/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("the shop's paths", () => {
  it("are all distinct", () => {
    const values = Object.values(paths).filter((value) => typeof value === "string");
    expect(values.length).toBeGreaterThan(20);
    expect(new Set(values).size).toBe(values.length);
  });

  it("keep the paths written out in full in step with the paths they extend", () => {
    expect(paths.TERMS_PATH).toBe(`${paths.DISCLAIMER_PATH}#terms-heading`);
    expect(paths.METHODS_PATH).toBe(`${paths.DISCLAIMER_PATH}#methods-heading`);
    expect(paths.DOSSIER_DISPATCH_PATH).toBe(`${paths.DOSSIER_PATH}#dispatch`);
    expect(paths.VAULT_OPENED_LOCATION).toBe(`${paths.VAULT_PATH}?opened=1#latest-pull`);
    expect(paths.VAULT_PULL_PATH).toBe(`${paths.VAULT_PATH}/pull`);
    expect(paths.LEDGER_PATH).toBe(`${paths.BUREAU_PATH}/ledger`);
  });

  it("build an exhibit's page and art from its slug", () => {
    expect(paths.itemPathFor("alien-paperclip")).toBe("/items/alien-paperclip");
    expect(paths.artPath("alien-paperclip")).toBe("/assets/art/alien-paperclip.svg");
  });

  it("are never typed out as links or quoted routes outside paths.ts", () => {
    // The generated bundles carry the paths their scripts use, copied from paths.ts.
    const files = Object.entries(SOURCES).filter(
      ([file]) => !file.endsWith("/core/paths.ts") && !file.endsWith(".generated.ts"),
    );
    expect(files.length).toBeGreaterThan(40);
    // href="/..." in a page, or a whole route as a quoted string.
    const typedOut =
      /href="\/[^"$]*"|["'`]\/(vault|dossier|disclaimer|broadcast|thanks|events|dispatch|streak|bureau|webhooks)(\/[a-z/]*)?["'`#?]/;
    const offenders = files.flatMap(([file, text]) =>
      text
        .split("\n")
        .filter((line) => typedOut.test(line))
        .map((line) => `${file}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
