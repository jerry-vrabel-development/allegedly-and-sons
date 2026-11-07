import { findItem } from "../core/catalog";
import { CHECKOUT_PATH, checkoutSessionForm, THANKS_PATH } from "../core/checkout";
import { ART } from "./art";
import type { SafeHtml } from "./html";
import {
  checkoutClosedPage,
  checkoutUnavailablePage,
  disclaimerPage,
  homePage,
  itemPage,
  notFoundPage,
  STYLESHEET_PATH,
  thanksPage,
} from "./pages";
import { withSecurityHeaders } from "./security-headers";
import { createCheckoutSession } from "./stripe";
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

/** What `route` needs from the outside world, so tests can swap in fakes. */
export interface Deps extends WebhookDeps {
  /** Stripe secret key, or undefined when checkout isn't configured. */
  readonly stripeKey: string | undefined;
  readonly fetch: typeof fetch;
}

const TEXT = "text/plain; charset=utf-8";
const ITEM_PATH = /^\/items\/([a-z0-9-]+)$/;
const ART_PATH = /^\/assets\/art\/([a-z0-9-]+)\.svg$/;

/** Pages may change often while the shop is a prototype, so browsers revalidate. */
function page(body: SafeHtml, status = 200): Response {
  return new Response(body.value, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
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

/** Routes a request. Kept separate from `fetch` so it stays easy to test. */
export async function route(request: Request, deps: Deps): Promise<Response> {
  if (request.method === "POST") {
    if (new URL(request.url).pathname === WEBHOOK_PATH) return stripeWebhook(request, deps);
    const slug = CHECKOUT_PATH.exec(new URL(request.url).pathname)?.[1];
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
      return page(thanksPage());
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
  if (item) return page(itemPage(item, origin));

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

/** The current time in whole Unix seconds. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export default {
  async fetch(request: Request, env: Env & Secrets): Promise<Response> {
    const response = await route(request, {
      stripeKey: stripeKeyFrom(env),
      fetch: globalFetch,
      webhookSecret: webhookSecretFrom(env),
      db: env.DB,
      nowSeconds,
    });
    return withSecurityHeaders(response, new URL(request.url).pathname);
  },
} satisfies ExportedHandler<Env & Secrets>;
