import { findItem } from "../core/catalog";
import {
  CHECKOUT_PATH,
  CHECKOUT_SESSION_PATH,
  checkoutSessionForm,
  embeddedCheckoutSessionForm,
  returnOutcome,
  SESSION_ID,
  THANKS_PATH,
} from "../core/checkout";
import { recordItemView, type AnalyticsDeps } from "./analytics";
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
  STYLESHEET_PATH,
  thanksPage,
  type ReturnView,
} from "./pages";
import { withSecurityHeaders } from "./security-headers";
import {
  createCheckoutSession,
  createEmbeddedCheckoutSession,
  retrieveCheckoutSession,
} from "./stripe";
import { CHECKOUT_JS, CHECKOUT_SCRIPT_PATH } from "./checkout-script";
import { SITE_CSS } from "./styles";
import { stripeWebhook, WEBHOOK_PATH, type WebhookDeps } from "./webhook";

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
}

/** What `route` needs from the outside world, so tests can swap in fakes. */
export interface Deps extends WebhookDeps, AnalyticsDeps {
  /** Stripe publishable key for the embedded checkout, or undefined to use only the hosted flow. */
  readonly publishableKey?: string | undefined;
  /** Stripe secret key, or undefined when checkout isn't configured. */
  readonly stripeKey: string | undefined;
  readonly fetch: typeof fetch;
}

const TEXT = "text/plain; charset=utf-8";
const ITEM_PATH = /^\/items\/([a-z0-9-]+)$/;
const ART_PATH = /^\/assets\/art\/([a-z0-9-]+)\.svg$/;

/**
 * Every HTML page says no-transform: nothing between us and the browser may
 * rewrite it. In particular Cloudflare won't inject its Web Analytics beacon,
 * even if that setting is switched back on, so the Fine Print's "no trackers"
 * stays true by construction.
 */
const PAGE_CACHE = "public, max-age=0, must-revalidate, no-transform";

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
  const item = findItem(slug);
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
    checkoutSessionForm(item, origin),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`checkout failed: ${result.reason}`);
    return page(checkoutUnavailablePage(item), 502);
  }
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
  const item = findItem(slug);
  if (!item) return json({ error: "not found" }, 404);

  const { origin } = new URL(request.url);
  if (request.headers.get("Origin") !== origin) return json({ error: "forbidden" }, 403);

  if (deps.stripeKey === undefined) return json({ error: "closed" }, 503);

  const result = await createEmbeddedCheckoutSession(
    deps.stripeKey,
    embeddedCheckoutSessionForm(item, origin),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`embedded checkout failed: ${result.reason}`);
    return json({ error: "unavailable" }, 502);
  }
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

/** Routes a request. Kept separate from `fetch` so it stays easy to test. */
export async function route(request: Request, deps: Deps): Promise<Response> {
  if (request.method === "POST") {
    const { pathname: postPath } = new URL(request.url);
    if (postPath === WEBHOOK_PATH) return stripeWebhook(request, deps);
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
    case "/disclaimer":
      return page(disclaimerPage());
    case THANKS_PATH:
      return returnPage(new URL(request.url), deps);
    case CHECKOUT_SCRIPT_PATH:
      return new Response(CHECKOUT_JS, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
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

  const slug = ITEM_PATH.exec(pathname)?.[1];
  const item = slug === undefined ? undefined : findItem(slug);
  if (item) {
    recordItemView(request, item, deps);
    return page(itemPage(item, origin));
  }

  // The embedded checkout page. Nothing links here until PR 3 mounts Stripe's form.
  const checkoutSlug = CHECKOUT_PATH.exec(pathname)?.[1];
  const checkoutItem = checkoutSlug === undefined ? undefined : findItem(checkoutSlug);
  if (checkoutItem) {
    if (deps.stripeKey === undefined) return page(checkoutClosedPage(checkoutItem), 503);
    const response = page(checkoutPage(checkoutItem, deps.publishableKey));
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

export default {
  async fetch(
    request: Request,
    env: Env & Secrets & PublicVars,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const response = await route(request, {
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
    return withSecurityHeaders(response, new URL(request.url).pathname);
  },
} satisfies ExportedHandler<Env & Secrets & PublicVars>;
