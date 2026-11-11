/**
 * The Bureau Dispatch, part 1 (design note 0007): pure rules for
 * registration, recovery and unsubscribing. No address is ever logged.
 */

/** The address Dispatch mail comes from. Replies go to the order contact. */
export const DISPATCH_FROM = {
  email: "dispatch@allegedlyandsons.com",
  name: "The Bureau Dispatch",
};

export type TokenPurpose = "confirm" | "recover";

/** How long a one-time link works, in seconds. */
export const TOKEN_LIFETIME: Readonly<Record<TokenPurpose, number>> = {
  confirm: 24 * 60 * 60,
  recover: 60 * 60,
};

/** Links per address per day, per browser per hour, and sends per day overall. */
export const LIMITS = { perEmailPerDay: 3, perBrowserPerHour: 3, perDay: 500 } as const;

/** Bytes of randomness in a one-time link token (256 bits). */
export const TOKEN_BYTES = 32;
/** Bytes in an unsubscribe token (128 bits). */
export const UNSUBSCRIBE_BYTES = 16;

export const TOKEN = /^[0-9a-f]{64}$/;
export const UNSUBSCRIBE_TOKEN = /^[0-9a-f]{32}$/;

const EMAIL = /^[^\s@<>"(),;:\\[\]]+@[^\s@<>"(),;:\\[\]]+\.[^\s@<>"(),;:\\[\].]+$/;

/**
 * A typed address, trimmed and lowercased, or undefined if it can't be one.
 * Deliberately simple: the confirmation link is the real check.
 */
export function normalizeEmail(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL.test(email)) return undefined;
  return email;
}

/** "j•••@gmail.com": enough to recognize your own address on screen. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}

export interface OutgoingEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly headers?: Readonly<Record<string, string>>;
}

function footer(postalAddress: string, unsubscribeUrl?: string): string {
  const lines = [
    "—",
    "The Bureau Dispatch",
    `Allegedly & Sons, ${postalAddress}`,
    "Questions? Reply to this email.",
  ];
  if (unsubscribeUrl !== undefined) lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

/** The confirmation email for a new registration. */
export function confirmEmail(to: string, link: string, postalAddress: string): OutgoingEmail {
  return {
    to,
    subject: "Confirm your registration with the Bureau",
    text: [
      "Agent,",
      "",
      "Someone (we trust it was you) asked to register this address with the Bureau of Improbable Acquisitions.",
      "",
      "Confirm it here:",
      link,
      "",
      "The link works once, for 24 hours. If you didn't ask, ignore this email and nothing happens.",
      "",
      footer(postalAddress),
    ].join("\n"),
  };
}

/** The recovery email: brings a registered file to the browser that asked. */
export function recoverEmail(
  to: string,
  link: string,
  postalAddress: string,
  unsubscribeUrl: string,
): OutgoingEmail {
  return {
    to,
    subject: "Your Bureau file, on a new device",
    text: [
      "Agent,",
      "",
      "Someone (we trust it was you) asked to open your Bureau file on another device.",
      "",
      "Open it there with this link:",
      link,
      "",
      "The link works once, for 1 hour. If you didn't ask, ignore this email: your file stays where it is.",
      "",
      footer(postalAddress, unsubscribeUrl),
    ].join("\n"),
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
