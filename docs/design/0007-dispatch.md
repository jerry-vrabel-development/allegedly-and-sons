# 0007 — The Bureau Dispatch: registration and recovery (G3, part 1)

- **Status:** Decided; building
- **Date:** 2026-11-09
- **Author:** Jerry Vrabel

## Problem

Note 0003's Hooked loop needs an outside trigger: something that brings an
agent back. Today a dossier also lives in one browser's cookie; clear it, or
switch phones, and the file is gone. Both need the same thing: an email
address the agent chooses to give us.

This part covers only getting and keeping that address honestly: register,
confirm, recover a file on another device, unsubscribe. Sending the Dispatch
itself ("your pull is ready", new acquisitions) is part 2.

## Options

1. **A third-party list provider** (Mailchimp, Buttondown). Good editors and
   deliverability, but the address lives in someone else's database, the
   dossier link needs a sync, and it's another account and bill.
2. **Cloudflare Email Service from the Worker (chosen).** A `send_email`
   binding, no API key, the address stays in our D1 next to the dossier.
   Costs: it's in beta, it needs the Workers Paid plan (on since 2026-11-09),
   and we own unsubscribe handling and deliverability ourselves.

## The flows

One form on `/dossier`, "Register with the Bureau," asks only for an email.
Whatever is typed, the answer is the same "check your inbox" page, so the
form never reveals whether an address is registered.

- **New address:** a confirmation link goes to it. Nothing is stored as
  registered until the link is used (double opt-in). The pending address
  lives only in the one-time token.
- **Address already registered to another file:** a recovery link goes to
  it instead. Using it moves that file to this browser.
- **Links are one-time**, stored only as SHA-256 hashes, and expire
  (confirm: 24 hours; recover: 1 hour). Opening a link shows a button; only
  the button's POST acts, because mail scanners open links on their own.
- **Unsubscribe:** a link in every email to a registered agent, plus the
  RFC 8058 one-click headers (`List-Unsubscribe`, `List-Unsubscribe-Post`)
  Gmail and Yahoo require of bulk senders. Instant, no sign-in, no "are you
  sure" persuasion. Unsubscribing stops mail but keeps the address, so the
  agent can still recover their file; the Fine Print says how to have it
  deleted.
- **Limits:** at most 3 links per address per day, 3 per browser per hour,
  and 500 sends a day overall. Over a limit, nothing is sent and the page
  looks the same. Sending happens after the response, so timing doesn't
  reveal anything either.

## Privacy and law

- Addresses are stored only in `dispatch_agents`, never in analytics,
  logs, Stripe or the Ledger (which gets counts). Error logs name the
  failure, never the address.
- **CAN-SPAM:** every email carries a valid postal address in its footer.
  The Dispatch stays closed (the form says so, and nothing sends) until
  `DISPATCH_POSTAL_ADDRESS` is set. Part 1 sends only transactional mail
  (confirm, recover); part 2's commercial mail adds the unsubscribe link
  on every message, honored instantly.

## What would change our mind

- Bounce or spam-report rates that hurt the domain → move bulk sends (part 2)
  to a dedicated list provider and keep only transactional mail here.
- Abuse of the form → add Turnstile in front of it.
