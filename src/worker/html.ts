/**
 * A tiny, safe HTML builder.
 *
 * Everything interpolated into `html` is escaped unless it is already
 * `SafeHtml` (the result of another `html` call). That makes "forgot to
 * escape" impossible by construction: lore from future writers can contain
 * `<`, `&` or quotes and still render as text.
 */

/** Escapes text for use in HTML content and quoted attribute values. */
export function escapeHtml(text: string): string {
  // "&" goes first so the entities added below are not escaped again.
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** HTML that is already safe to send. Only `html` creates it. */
export class SafeHtml {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

export type Interpolation = SafeHtml | string | number | readonly Interpolation[];

function render(value: Interpolation): string {
  if (value instanceof SafeHtml) return value.value;
  if (typeof value === "string") return escapeHtml(value);
  if (typeof value === "number") return String(value);
  return value.map(render).join("");
}

/** Tagged template that escapes every interpolated value. */
export function html(strings: TemplateStringsArray, ...values: readonly Interpolation[]): SafeHtml {
  let out = "";
  strings.forEach((chunk, index) => {
    out += chunk;
    // There is one fewer value than chunk, so the last chunk has none.
    const value = values[index];
    if (value !== undefined) out += render(value);
  });
  return new SafeHtml(out);
}
