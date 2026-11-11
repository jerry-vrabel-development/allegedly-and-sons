/**
 * Buying an exhibit: starting checkout (hosted and embedded), the embedded
 * checkout page, and the page Stripe returns the buyer to.
 */

import { offerFor } from "../core/broadcast";
import { findAvailableItem, findItem } from "../core/catalog";
import {
  CHECKOUT_PATH,
  checkoutSessionForm,
  embeddedCheckoutSessionForm,
  returnOutcome,
  SESSION_ID,
} from "../core/checkout";
import { recordCheckoutStarted } from "./analytics";
import type { Deps } from "./deps";
import { json, page, PRIVATE_PAGE_CACHE, TEXT } from "./http";
import {
  checkoutClosedPage,
  checkoutPage,
  checkoutUnavailablePage,
  notFoundPage,
  thanksPage,
  type ReturnView,
} from "./pages";
import {
  createCheckoutSession,
  createEmbeddedCheckoutSession,
  retrieveCheckoutSession,
} from "./stripe";

/** Starts checkout for one item: POST /checkout/<slug> → 303 to Stripe. */
export async function checkout(request: Request, slug: string, deps: Deps): Promise<Response> {
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

/**
 * Creates an embedded Checkout Session for one item: POST /checkout/<slug>/session
 * → { clientSecret }. Called by our own checkout page's script, so the Origin
 * header is required and must be ours (browsers always send it on fetch POSTs).
 */
export async function embeddedSession(
  request: Request,
  slug: string,
  deps: Deps,
): Promise<Response> {
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
export async function returnPage(url: URL, deps: Deps): Promise<Response> {
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

/** The embedded checkout page, GET /checkout/<slug>, or undefined for any other path. */
export function embeddedCheckoutPage(pathname: string, deps: Deps): Response | undefined {
  const checkoutSlug = CHECKOUT_PATH.exec(pathname)?.[1];
  const checkoutItem = checkoutSlug === undefined ? undefined : findAvailableItem(checkoutSlug);
  if (!checkoutItem) return undefined;
  if (deps.stripeKey === undefined) return page(checkoutClosedPage(checkoutItem), 503);
  const response = page(
    checkoutPage(checkoutItem, deps.publishableKey, offerFor(checkoutItem, deps.nowSeconds())),
  );
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}
