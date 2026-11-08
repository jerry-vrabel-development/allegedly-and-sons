import { describe, expect, it } from "vitest";
import * as entry from "../src/worker/index";

describe("the Worker's entry module", () => {
  // workerd treats every named export of the entry module as an entrypoint and
  // refuses to start if one isn't a function or handler object. Vitest imports
  // the module like any other, so only this test (and `wrangler dev`) catch it.
  it("exports only functions besides the default handler", () => {
    const named = Object.entries(entry).filter(([name]) => name !== "default");
    for (const [name, value] of named) {
      expect(typeof value, `${name} would stop the Worker from starting`).toBe("function");
    }
  });
});
