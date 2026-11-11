import { describe, expect, it } from "vitest";
import { cookieValue } from "../src/core/cookies";

describe("cookieValue", () => {
  it("finds a cookie by name among others, trimmed", () => {
    expect(cookieValue("a=1; __Host-vid= abc ; b=2", "__Host-vid")).toBe("abc");
    expect(cookieValue("a=1", "a")).toBe("1");
  });

  it("is undefined without a header or without that cookie", () => {
    expect(cookieValue(null, "a")).toBeUndefined();
    expect(cookieValue("", "a")).toBeUndefined();
    expect(cookieValue("b=2; novalue", "a")).toBeUndefined();
    // A name must match whole, not as a prefix or suffix.
    expect(cookieValue("aa=1; xa=2", "a")).toBeUndefined();
  });

  it("returns the first of two cookies with the same name, and keeps '=' inside a value", () => {
    expect(cookieValue("a=first; a=second", "a")).toBe("first");
    expect(cookieValue("a=x=y", "a")).toBe("x=y");
    expect(cookieValue("a=", "a")).toBe("");
  });
});
