import { describe, expect, it } from "vitest";
import {
  confirmEmail,
  maskEmail,
  normalizeEmail,
  recoverEmail,
  TOKEN_LIFETIME,
} from "../src/core/dispatch";
import { hexFrom } from "../src/core/hex";

describe("addresses", () => {
  it("trims and lowercases a plausible address", () => {
    expect(normalizeEmail("  Agent.Smith+bureau@Example.COM ")).toBe(
      "agent.smith+bureau@example.com",
    );
    expect(normalizeEmail("a@b.co")).toBe("a@b.co");
  });

  it("refuses anything that can't be one", () => {
    for (const bad of [
      undefined,
      null,
      42,
      "",
      "agent",
      "agent@",
      "@example.com",
      "agent@example",
      "agent@example.",
      "two words@example.com",
      "a@b@example.com",
      "<agent@example.com>",
      "agent@example.com\r\nBcc: x@y.z",
      `${"a".repeat(250)}@example.com`,
    ]) {
      expect(normalizeEmail(bad)).toBeUndefined();
    }
  });

  it("masks an address down to its first letter and domain", () => {
    expect(maskEmail("jerry@gmail.com")).toBe("j•••@gmail.com");
  });
});

describe("tokens", () => {
  it("are hex, two digits a byte", () => {
    expect(hexFrom(new Uint8Array([0, 15, 255]))).toBe("000fff");
  });

  it("last a day to confirm and an hour to recover", () => {
    expect(TOKEN_LIFETIME).toEqual({ confirm: 86_400, recover: 3_600 });
  });
});

describe("the emails", () => {
  const ADDRESS = "PO Box 1, Chicago, IL 60626";

  it("asks a new agent to confirm, with the postal address and no tracking", () => {
    const email = confirmEmail("a@example.com", "https://x.example/dispatch/confirm?t=1", ADDRESS);
    expect(email.to).toBe("a@example.com");
    expect(email.subject).toBe("Confirm your registration with the Bureau");
    expect(email.text).toContain("https://x.example/dispatch/confirm?t=1");
    expect(email.text).toContain(`Allegedly & Sons, ${ADDRESS}`);
    expect(email.text).toContain("If you didn't ask, ignore this email and nothing happens.");
    expect(email.text).not.toContain("Unsubscribe");
    expect(email.headers).toBeUndefined();
  });

  it("offers a registered agent their file, with one-click unsubscribe", () => {
    const email = recoverEmail(
      "a@example.com",
      "https://x.example/dispatch/recover?t=1",
      ADDRESS,
      "https://x.example/dispatch/unsubscribe?u=2",
    );
    expect(email.subject).toBe("Your Bureau file, on a new device");
    expect(email.text).toContain("works once, for 1 hour");
    expect(email.text).toContain("Unsubscribe: https://x.example/dispatch/unsubscribe?u=2");
    expect(email.headers).toEqual({
      "List-Unsubscribe": "<https://x.example/dispatch/unsubscribe?u=2>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});
