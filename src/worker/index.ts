/**
 * The Worker's entry: wires the environment into `Deps` and routes each
 * request to its handler. Handlers live beside their feature
 * (checkout-routes.ts, vault-routes.ts, ...); this file only decides who
 * answers.
 */

import { offerFor } from "../core/broadcast";
import { findItem, ITEM_PATH } from "../core/catalog";
import { CHECKOUT_PATH, CHECKOUT_SESSION_PATH } from "../core/checkout";
import { effectsOn } from "../core/effects";
import { landingFromRequest } from "../core/landing";
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
  HOME_PATH,
  REPAIR_PATH,
  REPAIR_RETURN_PATH,
  STYLESHEET_PATH,
  THANKS_PATH,
  VAULT_PATH,
  VAULT_PULL_PATH,
  WEBHOOK_PATH,
} from "../core/paths";
import { parseSharePath } from "../core/share";
import { accessConfigFrom } from "./access";
import { recordItemView } from "./analytics";
import { assetResponse } from "./assets";
import { onAirBanner, wantsBanner, withBanner } from "./broadcast-page";
import { bureau } from "./bureau-routes";
import { checkout, embeddedCheckoutPage, embeddedSession, returnPage } from "./checkout-routes";
import type { Deps, PublicVars, Secrets } from "./deps";
import { dispatchRegister, linkLanding, unsubscribePost, useLink } from "./dispatch-routes";
import { sentPage } from "./dispatch-pages";
import {
  emailSender,
  globalFetch,
  nowSeconds,
  postalAddressFrom,
  publishableKeyFrom,
  stripeKeyFrom,
  webhookSecretFrom,
} from "./env";
import { page, TEXT } from "./http";
import { disclaimerPage, homePage, itemPage, notFoundPage } from "./pages";
import { repairCheckout, repairReturn } from "./repair-routes";
import { withSecurityHeaders } from "./security-headers";
import { broadcast, shareRedirect, storyRead } from "./shop-routes";
import { wantsSound, withSound } from "./sound-script";
import { dossierGet, vaultGet, vaultPull } from "./vault-routes";
import { visitorIdFor, withVisitorCookie } from "./visitor";
import { stripeWebhook } from "./webhook";

export type { Deps, PublicVars, Secrets } from "./deps";

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

  const url = new URL(request.url);
  const { pathname, origin } = url;

  switch (pathname) {
    case HOME_PATH:
      return page(homePage());
    case DISCLAIMER_PATH:
      return page(disclaimerPage());
    case THANKS_PATH:
      return returnPage(url, deps);
    case DOSSIER_PATH:
      return dossierGet(url, deps);
    case REPAIR_RETURN_PATH:
      return repairReturn(url, deps);
    case DISPATCH_SENT_PATH:
      return page(sentPage());
    case DISPATCH_CONFIRM_PATH:
      return linkLanding(url, "confirm");
    case DISPATCH_RECOVER_PATH:
      return linkLanding(url, "recover");
    case DISPATCH_UNSUBSCRIBE_PATH:
      return linkLanding(url, "unsubscribe");
    case VAULT_PATH:
      return vaultGet(url, deps);
    case BROADCAST_PATH:
      return broadcast(deps);
    case "/healthz":
      return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const asset = assetResponse(pathname);
  if (asset !== undefined) return asset;

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

  return embeddedCheckoutPage(pathname, deps) ?? page(notFoundPage(), 404);
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
