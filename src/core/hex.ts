/** Lowercase hex for bytes: two characters each. */
export function hexFrom(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
