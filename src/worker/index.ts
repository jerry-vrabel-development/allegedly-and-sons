import { findAvailableItem, findItem, ITEM_PATH } from "../core/catalog";
import { isAutomated, parseReadBeacon } from "../core/analytics";
import {
  isNetwork,
  REF_BYTES,
  parseSharePath,
  refFrom,
  sharedItemUrl,
  shareTarget,
} from "../core/share";
import {
  CHECKOUT_PATH,
  CHECKOUT_SESSION_PATH,
  checkoutSessionForm,
  embeddedCheckoutSessionForm,
  returnOutcome,
  SESSION_ID,
} from "../core/checkout";
import {
  recordCheckoutStarted,
  recordItemView,
  recordShareClicked,
  recordStoryRead,
  type AnalyticsDeps,
} from "./analytics";
import { ART } from "./art";
import type { SafeHtml } from "./html";
import {
  checkoutClosedPage,
  checkoutPage,
  checkoutUnavailablePage,
  disclaimerPage,
  homePage,
  itemPage,
  notFoundPage,
  ORDER_CONTACT_EMAIL,
  thanksPage,
  type ReturnView,
} from "./pages";
import { withSecurityHeaders } from "./security-headers";
import {
  createCheckoutSession,
  createEmbeddedCheckoutSession,
  retrieveCheckoutSession,
} from "./stripe";
import { scriptResponse } from "./scripts";
import { SITE_CSS } from "./styles";
import { visitorIdFor, withVisitorCookie } from "./visitor";
import { landingFromRequest } from "../core/landing";
import { ACCESS_JWT_HEADER, accessConfigFrom, verifyAccessJwt, type AccessDeps } from "./access";
import { ledgerPage, periodFrom, readLedger } from "./ledger";
import { readDossier } from "./dossier";
import { dossierPage } from "./dossier-page";
import { stripeWebhook, type WebhookDeps } from "./webhook";
import { pullJson, pullLever, readVault, secureUint32 } from "./vault";
import { readStreak } from "./streak";
import { offerFor, segmentAt } from "../core/broadcast";
import { effectsOn } from "../core/effects";
import { broadcastPage, onAirBanner, wantsBanner, withBanner } from "./broadcast-page";
import { repairSessionForm } from "../core/repair";
import { canRepair } from "../core/streak";
import { vaultDay } from "../core/vault";
import { repairReturnPage, repairUnavailablePage, type RepairReturn } from "./repair-page";
import { vaultPage } from "./vault-page";
import { wantsSound, withSound } from "./sound-script";
import { rollFrom } from "../core/vault";
import { visitorCookie, visitorIdFromCookie } from "../core/visitor";
import {
  DISPATCH_FROM,
  TOKEN,
  UNSUBSCRIBE_TOKEN,
  normalizeEmail,
  type OutgoingEmail,
} from "../core/dispatch";
import {
  confirmRegistration,
  readRegistration,
  recoverFile,
  requestLink,
  unsubscribe,
  type Opened,
} from "./dispatch";
import {
  dispatchClosedPage,
  dispatchNoticeFrom,
  linkExpiredPage,
  linkPage,
  sentPage,
  unsubscribedPage,
  type LinkKind,
} from "./dispatch-pages";
import {
  BROADCAST_PATH,
  BUREAU_PATH,
  DISCLAIMER_PATH,
  DISPATCH_CONFIRM_PATH,
  DISPATCH_PATH,
  DISPATCH_RECOVER_PATH,
  DISPATCH_SENT_PATH,
  DISPATCH_UNSUBSCRIBE_PATH,
  DOSSIER_PATH,
  EVENTS_PATH,
  LEDGER_PATH,
  REPAIR_PATH,
  REPAIR_RETURN_PATH,
  STYLESHEET_PATH,
  THANKS_PATH,
  VAULT_OPENED_LOCATION,
  VAULT_PATH,
  VAULT_PULL_PATH,
  WEBHOOK_PATH,
} from "../core/paths";

/**
 * Secrets the Worker reads. Set each with `npx wrangler secret put <NAME>`, and
 * locally in .dev.vars.
 */
export interface Secrets {
  readonly STRIPE_SECRET_KEY?: string;
  /** The webhook endpoint's signing secret (whsec_...), from the Stripe dashboard. */
  readonly STRIPE_WEBHOOK_SECRET?: string;
}

/** Public config. Not secret: Stripe publishable keys are meant to be in pages. */
export interface PublicVars {
  /** pk_test_... or pk_live_..., set in wrangler.jsonc "vars". */
  readonly STRIPE_PUBLISHABLE_KEY?: string;
  /** Cloudflare Access team domain, e.g. allegedlyandsons.cloudflareaccess.com. */
  readonly ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's Audience (AUD) tag for /bureau. Unset keeps /bureau closed. */
  readonly ACCESS_AUD?: string;
  /**
   * The postal address every Dispatch email carries (CAN-SPAM). Public: it's
   * in every email. Unset keeps the Dispatch closed (note 0007).
   */
  readonly DISPATCH_POSTAL_ADDRESS?: string;
}

/** What `route` needs from the outside world, so tests can swap in fakes. */
export interface Deps extends WebhookDeps, AnalyticsDeps, AccessDeps {
  /** Stripe publishable key for the embedded checkout, or undefined to use only the hosted flow. */
  readonly publishableKey?: string | undefined;
  /** Stripe secret key, or undefined when checkout isn't configured. */
  readonly stripeKey: string | undefined;
  readonly fetch: typeof fetch;
  /** Random 32-bit numbers for the vault lever. Defaults to the secure generator. */
  readonly randomUint32?: () => number;
  /** Sends one Dispatch email. Undefined when the Worker has no email binding. */
  readonly sendEmail?: ((email: OutgoingEmail) => Promise<void>) | undefined;
  /** The Dispatch footer's postal address. Undefined keeps the Dispatch closed. */
  readonly postalAddress?: string | undefined;
}

const TEXT = "text/plain; charset=utf-8";
const ART_PATH = /^\/assets\/art\/([a-z0-9-]+)\.svg$/;

/**
 * HTML pages are private: each one may carry this visitor's cookie, so no
 * shared cache may keep one and hand it to someone else. They also say
 * no-transform: nothing between us and the browser may rewrite them (for
 * example, Cloudflare can't inject a script), so the Fine Print's account of
 * what runs in your browser stays true.
 */
const PAGE_CACHE = "private, max-age=0, must-revalidate, no-transform";

/** For pages about one buyer's checkout: never cached, never rewritten. */
const PRIVATE_PAGE_CACHE = "no-store, no-transform";

/** Pages may change often while the shop is a prototype, so browsers revalidate. */
function page(body: SafeHtml, status = 200): Response {
  return new Response(body.value, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": PAGE_CACHE,
    },
  });
}

/** Starts checkout for one item: POST /checkout/<slug> → 303 to Stripe. */
async function checkout(request: Request, slug: string, deps: Deps): Promise<Response> {
  // Acquisition-pending exhibits can't be bought (note 0010).
  const item = findAvailableItem(slug);
  if (!item) return page(notFoundPage(), 404);

  // A cross-site page can't start checkouts on our behalf. Browsers send Origin on form posts.
  const { origin } = new URL(request.url);
  const sentFrom = request.headers.get("Origin");
  if (sentFrom !== null && sentFrom !== origin) {
    return new Response("Forbidden.\n", { status: 403, headers: { "Content-Type": TEXT } });
  }

  if (deps.stripeKey === undefined) return page(checkoutClosedPage(item), 503);

  const result = await createCheckoutSession(
    deps.stripeKey,
    checkoutSessionForm(item, origin, deps.visitorId, offerFor(item, deps.nowSeconds())),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`checkout failed: ${result.reason}`);
    return page(checkoutUnavailablePage(item), 502);
  }
  recordCheckoutStarted(request, item, deps);
  return new Response(null, {
    status: 303,
    headers: { Location: result.url, "Cache-Control": "no-store" },
  });
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Creates an embedded Checkout Session for one item: POST /checkout/<slug>/session
 * → { clientSecret }. Called by our own checkout page's script, so the Origin
 * header is required and must be ours (browsers always send it on fetch POSTs).
 */
async function embeddedSession(request: Request, slug: string, deps: Deps): Promise<Response> {
  const item = findAvailableItem(slug);
  if (!item) return json({ error: "not found" }, 404);

  const { origin } = new URL(request.url);
  if (request.headers.get("Origin") !== origin) return json({ error: "forbidden" }, 403);

  if (deps.stripeKey === undefined) return json({ error: "closed" }, 503);

  const result = await createEmbeddedCheckoutSession(
    deps.stripeKey,
    embeddedCheckoutSessionForm(item, origin, deps.visitorId, offerFor(item, deps.nowSeconds())),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`embedded checkout failed: ${result.reason}`);
    return json({ error: "unavailable" }, 502);
  }
  recordCheckoutStarted(request, item, deps);
  return json({ clientSecret: result.clientSecret });
}

/**
 * The return page: GET /thanks?session_id=cs_... Asks Stripe about the session
 * before saying anything, so opening /thanks by hand proves nothing. Without a
 * usable session id or a Stripe key, it says only what it can.
 */
async function returnPage(url: URL, deps: Deps): Promise<Response> {
  const id = url.searchParams.get("session_id");
  let view: ReturnView = { kind: "unchecked" };

  if (id !== null && SESSION_ID.test(id) && deps.stripeKey !== undefined) {
    const lookup = await retrieveCheckoutSession(deps.stripeKey, id, deps.fetch);
    if (lookup.ok) {
      const outcome = returnOutcome(lookup.session);
      view =
        outcome.kind === "unchecked"
          ? outcome
          : {
              kind: outcome.kind,
              item: outcome.slug === undefined ? undefined : findItem(outcome.slug),
            };
    } else {
      console.error(`return page: ${lookup.reason}`);
    }
  }

  const response = page(thanksPage(view));
  // The answer is about one buyer's session; never cache or share it.
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}

/**
 * A share button: GET /share/<slug>/<network>. Mints a ref code, records the
 * share, and sends the visitor on to the network's share page (or their mail
 * app) with a link back to the item that carries the ref. Never cached: every
 * press gets its own ref.
 */
function shareRedirect(
  request: Request,
  slug: string,
  network: string,
  origin: string,
  deps: Deps,
): Response {
  const item = findItem(slug);
  if (item === undefined || !isNetwork(network)) return page(notFoundPage(), 404);
  const ref = refFrom(crypto.getRandomValues(new Uint8Array(REF_BYTES)));
  recordShareClicked(request, item, network, ref, deps);
  const location = shareTarget(network, {
    url: sharedItemUrl(origin, item.slug, ref),
    text: `${item.name}: ${item.tagline}`,
  });
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

/** The largest story beacon we'll read. Real ones are under 100 bytes. */
const MAX_BEACON_BYTES = 1024;

/**
 * Story reads from the item page's script: POST /events with
 * {"item": "<slug>", "depth": "opened" | "finished"}. Only our own pages may
 * send them (Origin must be ours), bots are ignored, and repeats and floods
 * are dropped (see recordStoryRead). Answers 204 whether or not a row was
 * written, so a sender learns nothing from it.
 */
async function storyRead(request: Request, deps: Deps): Promise<Response> {
  const { origin } = new URL(request.url);
  if (request.headers.get("Origin") !== origin) return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > MAX_BEACON_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const beacon = parseReadBeacon(body);
  if (beacon === undefined) return new Response(null, { status: 400 });
  if (!isAutomated(request.headers.get("User-Agent"))) {
    await recordStoryRead(request, beacon, deps);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

/**
 * The private ledger: GET /bureau/ledger. Cloudflare Access guards /bureau;
 * this checks Access's signed token too, so a misconfigured Access rule fails
 * closed. Without a valid token, /bureau/* is simply not found.
 */
async function bureau(request: Request, pathname: string, deps: Deps): Promise<Response> {
  const identity = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER), deps);
  if (identity === undefined || pathname !== LEDGER_PATH) return page(notFoundPage(), 404);
  const url = new URL(request.url);
  const ledger = await readLedger(deps.db, periodFrom(url), deps.nowSeconds(), url.hostname);
  const response = page(ledgerPage(ledger, identity.email));
  response.headers.set("Cache-Control", "private, no-store, no-transform");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

/**
 * The vault lever: POST /vault/pull, a plain form on /vault. Only an agent
 * who already has the visitor cookie can pull (a first visit sets it), bots
 * never pull, and the Worker alone decides whether a pull is allowed and what
 * it draws. Always answers with a redirect back to /vault (post, redirect,
 * get), so reloading the result page never pulls again.
 */
async function vaultPull(request: Request, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  // The Vault's own script asks for JSON so it can play the reel in place
  // (design note 0008). The result is decided here, before any animation.
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  const visitorId = returningVisitor(request, deps);
  if (visitorId === undefined) {
    return wantsJson ? json({ ok: false, reason: "no-file" }, 403) : seeOther(VAULT_PATH);
  }
  const roll = rollFrom(deps.randomUint32 ?? secureUint32);
  const now = deps.nowSeconds();
  const result = await pullLever(deps.db, visitorId, now, roll);
  if (!wantsJson) return seeOther(result.ok ? VAULT_OPENED_LOCATION : VAULT_PATH);
  if (!result.ok) return json({ ok: false, reason: "none-left" }, 409);
  const [vault, streak] = await Promise.all([
    readVault(deps.db, visitorId, now),
    readStreak(deps.db, visitorId, now),
  ]);
  return json(pullJson(result.card, result.kind, vault, streak));
}

/**
 * A form post that came from our own pages. Browsers send Origin on form
 * posts; one with no Origin is allowed, as on checkout, since the cookie is
 * SameSite=Lax and isn't sent on cross-site posts anyway.
 */
function fromOwnSite(request: Request): boolean {
  const sentFrom = request.headers.get("Origin");
  return sentFrom === null || sentFrom === new URL(request.url).origin;
}

function forbidden(): Response {
  return new Response("Forbidden.\n", { status: 403, headers: { "Content-Type": TEXT } });
}

function seeOther(location: string, setCookie?: string): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (setCookie !== undefined) headers.append("Set-Cookie", setCookie);
  return new Response(null, { status: 303, headers });
}

/**
 * The visitor id of a person who already has our cookie (a first visit sets
 * it), or undefined for a first visit or a bot. Actions that write anything
 * for a visitor need one.
 */
function returningVisitor(request: Request, deps: Deps): string | undefined {
  const fromCookie = visitorIdFromCookie(request.headers.get("Cookie"));
  if (deps.visitorId === null || fromCookie !== deps.visitorId) return undefined;
  if (isAutomated(request.headers.get("User-Agent"))) return undefined;
  return deps.visitorId;
}

/** The largest form we'll read. Real ones are well under 400 bytes. */
const MAX_FORM_BYTES = 2048;

/** One field of a url-encoded form, or undefined. */
async function formField(request: Request, name: string): Promise<string | undefined> {
  const text = await request.text();
  if (text.length > MAX_FORM_BYTES) return undefined;
  return new URLSearchParams(text).get(name) ?? undefined;
}

/** An error's code (Email Service errors have one), never its message. */
function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "unknown";
}

const DOSSIER_DISPATCH = `${DOSSIER_PATH}#dispatch`;

/**
 * The Dispatch form: POST /dispatch with an email (design note 0007). Always
 * ends on the same "check your inbox" page, whatever was typed, and sends
 * after responding, so neither the page nor its timing says whether an
 * address is registered.
 */
async function dispatchRegister(request: Request, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const { postalAddress, sendEmail } = deps;
  if (postalAddress === undefined || sendEmail === undefined) {
    return page(dispatchClosedPage(), 503);
  }
  const requester = returningVisitor(request, deps);
  if (requester === undefined) return seeOther(DOSSIER_DISPATCH);
  const email = normalizeEmail(await formField(request, "email"));
  if (email === undefined) return seeOther(`${DOSSIER_PATH}?dispatch=invalid#dispatch`);

  const result = await requestLink(deps.db, {
    email,
    requester,
    nowSeconds: deps.nowSeconds(),
    origin: new URL(request.url).origin,
    postalAddress,
  });
  if (result.outcome === "sent") {
    deps.waitUntil(
      sendEmail(result.email).catch((error: unknown) => {
        console.error(`dispatch: could not send a ${result.purpose} email (${errorCode(error)})`);
      }),
    );
  }
  return seeOther(DISPATCH_SENT_PATH);
}

/** An email link opens a page with a button; only the button acts. */
function linkLanding(url: URL, kind: LinkKind): Response {
  const token = url.searchParams.get(kind === "unsubscribe" ? "u" : "t") ?? "";
  const valid = (kind === "unsubscribe" ? UNSUBSCRIBE_TOKEN : TOKEN).test(token);
  const response = valid ? page(linkPage(kind, token)) : page(linkExpiredPage(), 404);
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}

/**
 * The button on a confirm or recover link. Opens the file on this browser by
 * setting the visitor cookie to it, then shows the dossier.
 */
async function useLink(
  request: Request,
  kind: "confirm" | "recover",
  deps: Deps,
): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const token = (await formField(request, "t")) ?? "";
  const now = deps.nowSeconds();
  const opened: Opened | undefined =
    kind === "confirm"
      ? await confirmRegistration(deps.db, token, now)
      : await recoverFile(deps.db, token, now);
  if (opened === undefined) return page(linkExpiredPage(), 410);
  const notice = opened.recovered ? "recovered" : "confirmed";
  return seeOther(`${DOSSIER_PATH}?dispatch=${notice}#dispatch`, visitorCookie(opened.visitorId));
}

/**
 * "Grease the Clerk": POST /streak/repair starts a Stripe Checkout Session to
 * buy back the visitor's dead streak, if it can still be bought back. The
 * price comes from core/repair.ts, never from the form. Anything else goes
 * back to the Vault.
 */
async function repairCheckout(request: Request, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const visitorId = returningVisitor(request, deps);
  const { stripeKey } = deps;
  if (visitorId === undefined || stripeKey === undefined) return seeOther(VAULT_PATH);
  const now = deps.nowSeconds();
  const streak = await readStreak(deps.db, visitorId, now);
  if (!canRepair(streak, vaultDay(now))) return seeOther(VAULT_PATH);
  const result = await createCheckoutSession(
    stripeKey,
    repairSessionForm(new URL(request.url).origin, visitorId, streak.lost),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`repair checkout failed: ${result.reason}`);
    return page(repairUnavailablePage(), 502);
  }
  return seeOther(result.url);
}

/**
 * What our own records say about a paid buy-back: restored (the repair is on
 * file), owed (the order is on file with no repair, so the payment restored
 * nothing), or pending (the webhook hasn't landed yet).
 */
async function paidRepairState(db: D1Database, sessionId: string): Promise<RepairReturn> {
  const [repairs, orders] = await db.batch([
    db.prepare("SELECT 1 FROM streak_repairs WHERE stripe_session_id = ?").bind(sessionId),
    db.prepare("SELECT 1 FROM orders WHERE stripe_session_id = ?").bind(sessionId),
  ]);
  if (repairs?.results.length === 1) return "restored";
  return orders?.results.length === 1 ? "owed" : "pending";
}

/**
 * Where Stripe sends a buy-back buyer. Says only what Stripe confirms about
 * the payment, and only what our records show about the streak.
 */
async function repairReturn(url: URL, deps: Deps): Promise<Response> {
  const id = url.searchParams.get("session_id");
  let outcome: RepairReturn = "unchecked";
  if (id !== null && SESSION_ID.test(id) && deps.stripeKey !== undefined) {
    const lookup = await retrieveCheckoutSession(deps.stripeKey, id, deps.fetch);
    if (lookup.ok) {
      const { kind } = returnOutcome(lookup.session);
      outcome = kind === "paid" ? await paidRepairState(deps.db, id) : kind;
    } else console.error(`repair return page: ${lookup.reason}`);
  }
  const response = page(repairReturnPage(outcome, id ?? ""));
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}

/**
 * Unsubscribe: the button on the unsubscribe page, or a mail app's one-click
 * POST to the List-Unsubscribe URL (RFC 8058, token in the query string). No
 * Origin check: mail providers post from their own servers, and the token is
 * the only thing that can unsubscribe anyone.
 */
async function unsubscribePost(request: Request, deps: Deps): Promise<Response> {
  const token = new URL(request.url).searchParams.get("u") ?? (await formField(request, "u")) ?? "";
  if (!UNSUBSCRIBE_TOKEN.test(token)) return page(linkExpiredPage(), 404);
  await unsubscribe(deps.db, token, deps.nowSeconds());
  const response = page(unsubscribedPage());
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}

/**
 * Routes a request, then puts the ON AIR banner (note 0009) on HTML pages
 * that carry it. Kept separate from `fetch` so it stays easy to test.
 */
export async function route(request: Request, deps: Deps): Promise<Response> {
  const response = await routeRequest(request, deps);
  const url = new URL(request.url);
  const { pathname } = url;
  if (
    response.status !== 200 ||
    !String(response.headers.get("Content-Type")).startsWith("text/html")
  ) {
    return response;
  }
  const banner = wantsBanner(pathname);
  // Sound for the "fx" group only (note 0011), by the same rule as the Vault's reel.
  const sound = wantsSound(pathname) && effectsOn(deps.visitorId, url.searchParams.get("fx"));
  if (!banner && !sound) return response;
  let page = await response.text();
  if (banner) page = withBanner(page, onAirBanner(deps.nowSeconds()));
  if (sound) page = withSound(page, STYLESHEET_PATH);
  return new Response(page, response);
}

/** The broadcast page, with the real count of orders in this segment. */
async function broadcast(deps: Deps): Promise<Response> {
  const now = deps.nowSeconds();
  const { results } = await deps.db
    .prepare("SELECT COUNT(*) AS sold FROM orders WHERE segment = ?")
    .bind(segmentAt(now).id)
    .all<{ sold: number }>();
  const [row] = results as [{ sold: number }];
  return page(broadcastPage(now, row.sold));
}

async function routeRequest(request: Request, deps: Deps): Promise<Response> {
  if (request.method === "POST") {
    const { pathname: postPath } = new URL(request.url);
    if (postPath === WEBHOOK_PATH) return stripeWebhook(request, deps);
    if (postPath === EVENTS_PATH) return storyRead(request, deps);
    if (postPath === VAULT_PULL_PATH) return vaultPull(request, deps);
    if (postPath === DISPATCH_PATH) return dispatchRegister(request, deps);
    if (postPath === REPAIR_PATH) return repairCheckout(request, deps);
    if (postPath === DISPATCH_CONFIRM_PATH) return useLink(request, "confirm", deps);
    if (postPath === DISPATCH_RECOVER_PATH) return useLink(request, "recover", deps);
    if (postPath === DISPATCH_UNSUBSCRIBE_PATH) return unsubscribePost(request, deps);
    const sessionSlug = CHECKOUT_SESSION_PATH.exec(postPath)?.[1];
    if (sessionSlug !== undefined) return embeddedSession(request, sessionSlug, deps);
    const slug = CHECKOUT_PATH.exec(postPath)?.[1];
    if (slug !== undefined) return checkout(request, slug, deps);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.\n", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Content-Type": TEXT },
    });
  }

  const { pathname, origin } = new URL(request.url);

  switch (pathname) {
    case "/":
      return page(homePage());
    case DISCLAIMER_PATH:
      return page(disclaimerPage());
    case THANKS_PATH:
      return returnPage(new URL(request.url), deps);
    case DOSSIER_PATH: {
      const now = deps.nowSeconds();
      const [agent, registration, streak] = await Promise.all([
        readDossier(deps.db, deps.visitorId),
        readRegistration(deps.db, deps.visitorId),
        readStreak(deps.db, deps.visitorId, now),
      ]);
      return page(
        dossierPage(
          agent,
          {
            open: deps.postalAddress !== undefined && deps.sendEmail !== undefined,
            registration,
            notice: dispatchNoticeFrom(new URL(request.url).searchParams.get("dispatch")),
          },
          streak,
          now,
          deps.stripeKey !== undefined,
        ),
      );
    }
    case REPAIR_RETURN_PATH:
      return repairReturn(new URL(request.url), deps);
    case DISPATCH_SENT_PATH:
      return page(sentPage());
    case DISPATCH_CONFIRM_PATH:
      return linkLanding(new URL(request.url), "confirm");
    case DISPATCH_RECOVER_PATH:
      return linkLanding(new URL(request.url), "recover");
    case DISPATCH_UNSUBSCRIBE_PATH:
      return linkLanding(new URL(request.url), "unsubscribe");
    case VAULT_PATH: {
      const now = deps.nowSeconds();
      const opened = new URL(request.url).searchParams.get("opened") === "1";
      const [vault, streak] = await Promise.all([
        readVault(deps.db, deps.visitorId, now),
        readStreak(deps.db, deps.visitorId, now),
      ]);
      const fx = effectsOn(deps.visitorId, new URL(request.url).searchParams.get("fx"));
      return page(vaultPage(vault, streak, now, opened, deps.stripeKey !== undefined, fx));
    }
    case BROADCAST_PATH:
      return broadcast(deps);
    case STYLESHEET_PATH:
      return new Response(SITE_CSS, {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    case "/healthz":
      return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const script = scriptResponse(pathname);
  if (script !== undefined) return script;

  if (pathname === BUREAU_PATH || pathname.startsWith(`${BUREAU_PATH}/`)) {
    return bureau(request, pathname, deps);
  }

  const share = parseSharePath(pathname);
  if (share !== undefined) return shareRedirect(request, share.slug, share.network, origin, deps);

  const slug = ITEM_PATH.exec(pathname)?.[1];
  const item = slug === undefined ? undefined : findItem(slug);
  if (item) {
    recordItemView(request, item, deps);
    return page(itemPage(item, origin, offerFor(item, deps.nowSeconds())));
  }

  // The embedded checkout page. Nothing links here until PR 3 mounts Stripe's form.
  const checkoutSlug = CHECKOUT_PATH.exec(pathname)?.[1];
  const checkoutItem = checkoutSlug === undefined ? undefined : findAvailableItem(checkoutSlug);
  if (checkoutItem) {
    if (deps.stripeKey === undefined) return page(checkoutClosedPage(checkoutItem), 503);
    const response = page(
      checkoutPage(checkoutItem, deps.publishableKey, offerFor(checkoutItem, deps.nowSeconds())),
    );
    response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
    return response;
  }

  const artSlug = ART_PATH.exec(pathname)?.[1];
  const svg = artSlug === undefined ? undefined : ART[artSlug];
  if (svg !== undefined) {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return page(notFoundPage(), 404);
}

/**
 * The real `fetch`, wrapped so it's never called with the wrong `this`
 * (Workers throw "Illegal invocation" if it is).
 */
export const globalFetch: typeof fetch = (input, init) => fetch(input, init);

/** A secret's value, trimmed, or undefined when it's missing or blank. */
function secretValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Reads the Stripe key from the environment, treating blank as unset. */
export function stripeKeyFrom(env: Secrets): string | undefined {
  return secretValue(env.STRIPE_SECRET_KEY);
}

/** Reads the webhook signing secret from the environment, treating blank as unset. */
export function webhookSecretFrom(env: Secrets): string | undefined {
  return secretValue(env.STRIPE_WEBHOOK_SECRET);
}

/** Reads the Stripe publishable key, accepting only pk_test_/pk_live_ keys. */
export function publishableKeyFrom(vars: PublicVars): string | undefined {
  const key = secretValue(vars.STRIPE_PUBLISHABLE_KEY);
  return key !== undefined && /^pk_(test|live)_[A-Za-z0-9]+$/.test(key) ? key : undefined;
}

/** The current time in whole Unix seconds. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Reads the Dispatch footer's postal address, treating blank as unset. */
export function postalAddressFrom(vars: PublicVars): string | undefined {
  return secretValue(vars.DISPATCH_POSTAL_ADDRESS);
}

/** Wraps the email binding so the rest of the Worker sends plain OutgoingEmails. */
export function emailSender(
  binding: SendEmail | undefined,
): ((email: OutgoingEmail) => Promise<void>) | undefined {
  if (binding === undefined) return undefined;
  return async (email) => {
    await binding.send({
      from: DISPATCH_FROM,
      replyTo: ORDER_CONTACT_EMAIL,
      to: email.to,
      subject: email.subject,
      text: email.text,
      ...(email.headers === undefined ? {} : { headers: { ...email.headers } }),
    });
  };
}

/** The bindings and vars the Worker runs with. EMAIL is optional so tests can leave it out. */
type WorkerEnv = Omit<Env, "EMAIL"> & { readonly EMAIL?: SendEmail } & Secrets & PublicVars;

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const visitorId = visitorIdFor(request);
    const response = await route(request, {
      sendEmail: emailSender(env.EMAIL),
      postalAddress: postalAddressFrom(env),
      visitorId,
      access: accessConfigFrom(env),
      stripeKey: stripeKeyFrom(env),
      publishableKey: publishableKeyFrom(env),
      fetch: globalFetch,
      webhookSecret: webhookSecretFrom(env),
      db: env.DB,
      nowSeconds,
      waitUntil: (promise) => {
        ctx.waitUntil(promise);
      },
    });
    const url = new URL(request.url);
    return withVisitorCookie(
      withSecurityHeaders(response, url.pathname),
      visitorId,
      landingFromRequest(url, request.headers.get("Referer"), url.hostname),
    );
  },
} satisfies ExportedHandler<WorkerEnv>;
