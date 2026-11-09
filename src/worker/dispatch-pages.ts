/**
 * The Bureau Dispatch's pages (design note 0007). No script: every action is
 * a plain form. Links from emails open a page with a button, and only the
 * button acts, since mail scanners open links by themselves.
 */

import {
  DISPATCH_CONFIRM_PATH,
  DISPATCH_PATH,
  DISPATCH_RECOVER_PATH,
  DISPATCH_UNSUBSCRIBE_PATH,
  maskEmail,
} from "../core/dispatch";
import type { Registration } from "./dispatch";
import { html, type SafeHtml } from "./html";
import { layout } from "./pages";

/** What the dossier says about the Dispatch for this visitor. */
export interface DispatchView {
  /** Sending is configured (postal address set and an email binding). */
  readonly open: boolean;
  readonly registration: Registration | undefined;
  /** A one-time message after a redirect (?dispatch=...). */
  readonly notice: DispatchNotice | undefined;
}

export type DispatchNotice = "confirmed" | "recovered" | "invalid";

export function dispatchNoticeFrom(value: string | null): DispatchNotice | undefined {
  return value === "confirmed" || value === "recovered" || value === "invalid" ? value : undefined;
}

const NOTICES: Readonly<Record<DispatchNotice, string>> = {
  confirmed: "Registration confirmed. Welcome to the Bureau, agent.",
  recovered: "Your file is open on this device.",
  invalid: "That doesn't look like an email address. Try again?",
};

function registerForm(button: string): SafeHtml {
  return html`<form class="dispatch-form" method="post" action="${DISPATCH_PATH}">
    <label for="dispatch-email">Your email</label>
    <input
      id="dispatch-email"
      name="email"
      type="email"
      autocomplete="email"
      inputmode="email"
      required
      maxlength="254"
    />
    <button class="button" type="submit">${button}</button>
  </form>`;
}

/** The Dispatch section on /dossier. */
export function dispatchSection(view: DispatchView): SafeHtml {
  const notice =
    view.notice === undefined
      ? html``
      : html`<p class="notice" role="status"><strong>${NOTICES[view.notice]}</strong></p>`;
  const { registration } = view;

  let body: SafeHtml;
  if (!view.open) {
    body = html`<p>
      Registration opens soon. Agents will be able to give the Bureau an email address to keep their
      file safe and open it on any device.
    </p>`;
  } else if (registration?.status === "confirmed") {
    body = html`<p>
        Registered as <strong>${maskEmail(registration.email)}</strong>. Your file is safe: on
        another device, enter the same address here and the Bureau will send a link to open it.
      </p>
      <details>
        <summary>Use a different address</summary>
        ${registerForm("Send a confirmation link")}
      </details>`;
  } else {
    body = html`<p>
        ${
          registration?.status === "unsubscribed"
            ? html`You've unsubscribed from Bureau mail. Register again any time.`
            : html`Give the Bureau an email address and your file is safe: open it on any device,
              even after clearing your cookies.`
        }
        We'll send one link to confirm it.
      </p>
      ${registerForm("Register with the Bureau")}
      <p class="small-print">
        Already registered on another device? Enter the same address and we'll send a link to open
        your file here. Your address is used only for Bureau mail; see
        <a href="/disclaimer#methods-heading">the fine print</a>.
      </p>`;
  }

  return html`<section class="prose dispatch" id="dispatch" aria-labelledby="dispatch-heading">
    <h2 id="dispatch-heading">The Bureau Dispatch</h2>
    ${notice} ${body}
  </section>`;
}

/** After the form: the same answer whatever was typed. */
export function sentPage(): SafeHtml {
  return layout({
    title: "Check your inbox",
    description: "A dispatch from the Bureau is on its way.",
    noindex: true,
    body: html`<div class="prose">
      <h1>Check your inbox</h1>
      <p class="tagline">A courier has been dispatched.</p>
      <p>
        If that address can receive mail, a link from the Bureau is on its way. It works once:
        within 24 hours to confirm a new registration, or within an hour to open your file on this
        device.
      </p>
      <p>Nothing there after a few minutes? Check your spam folder, or try again later.</p>
      <p><a href="/dossier">Back to your dossier</a></p>
    </div>`,
  });
}

const LINK_PAGES = {
  confirm: {
    title: "Confirm your registration",
    path: DISPATCH_CONFIRM_PATH,
    text: "One more step: confirm this address, and your file is registered with the Bureau.",
    button: "Confirm my registration",
  },
  recover: {
    title: "Open your file here",
    path: DISPATCH_RECOVER_PATH,
    text: "Open your Bureau file on this device. If this device already has a different file, it will be set aside.",
    button: "Open my file here",
  },
  unsubscribe: {
    title: "Unsubscribe",
    path: DISPATCH_UNSUBSCRIBE_PATH,
    text: "Stop all Bureau mail to this address. Your file stays yours, and you can still open it on another device.",
    button: "Unsubscribe",
  },
} as const;

export type LinkKind = keyof typeof LINK_PAGES;

/** The page an email link opens: a button that does the thing. */
export function linkPage(kind: LinkKind, token: string): SafeHtml {
  const page = LINK_PAGES[kind];
  const field = kind === "unsubscribe" ? "u" : "t";
  return layout({
    title: page.title,
    description: page.text,
    noindex: true,
    body: html`<div class="prose">
      <h1>${page.title}</h1>
      <p>${page.text}</p>
      <form class="dispatch-form" method="post" action="${page.path}">
        <input type="hidden" name="${field}" value="${token}" />
        <button class="button" type="submit">${page.button}</button>
      </form>
    </div>`,
  });
}

/** A link that's been used, has expired, or never existed. */
export function linkExpiredPage(): SafeHtml {
  return layout({
    title: "That link has expired",
    description: "Bureau links work once, for a limited time.",
    noindex: true,
    body: html`<div class="prose">
      <h1>That link has expired</h1>
      <p>
        Bureau links work once, for a limited time. Enter your address again on
        <a href="/dossier#dispatch">your dossier</a> and we'll send a fresh one.
      </p>
    </div>`,
  });
}

export function unsubscribedPage(): SafeHtml {
  return layout({
    title: "Unsubscribed",
    description: "No more Bureau mail.",
    noindex: true,
    body: html`<div class="prose">
      <h1>Unsubscribed</h1>
      <p>
        The Bureau won't send you mail any more. Your file is still yours: you can still open it on
        another device, and register again any time from <a href="/dossier">your dossier</a>.
      </p>
    </div>`,
  });
}

export function dispatchClosedPage(): SafeHtml {
  return layout({
    title: "Registration opens soon",
    description: "The Bureau Dispatch isn't open yet.",
    noindex: true,
    body: html`<div class="prose">
      <h1>Registration opens soon</h1>
      <p>The Bureau isn't sending mail yet. Nothing was sent or saved.</p>
      <p><a href="/dossier">Back to your dossier</a></p>
    </div>`,
  });
}
