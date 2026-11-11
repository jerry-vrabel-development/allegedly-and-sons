/**
 * The value of the first cookie named `name` in a Cookie header, trimmed, or
 * undefined when the header is missing or has no such cookie. The value is
 * not decoded or checked: the caller validates what it expects.
 */
export function cookieValue(header: string | null, name: string): string | undefined {
  if (header === null) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return undefined;
}
