/** The Vault and the dossier: the two pages an agent's file lives on, and the lever. */

import { effectsOn } from "../core/effects";
import { VAULT_OPENED_LOCATION, VAULT_PATH } from "../core/paths";
import { rollFrom } from "../core/vault";
import type { Deps } from "./deps";
import { readRegistration } from "./dispatch";
import { dispatchNoticeFrom } from "./dispatch-pages";
import { readDossier } from "./dossier";
import { dossierPage } from "./dossier-page";
import { forbidden, fromOwnSite, json, page, returningVisitor, seeOther } from "./http";
import { readStreak } from "./streak";
import { pullJson, pullLever, readVault, secureUint32 } from "./vault";
import { vaultPage } from "./vault-page";

/**
 * The vault lever: POST /vault/pull, a plain form on /vault. Only an agent
 * who already has the visitor cookie can pull (a first visit sets it), bots
 * never pull, and the Worker alone decides whether a pull is allowed and what
 * it draws. Always answers with a redirect back to /vault (post, redirect,
 * get), so reloading the result page never pulls again.
 */
export async function vaultPull(request: Request, deps: Deps): Promise<Response> {
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

/** The Vault page, GET /vault. */
export async function vaultGet(url: URL, deps: Deps): Promise<Response> {
  const now = deps.nowSeconds();
  const opened = url.searchParams.get("opened") === "1";
  const [vault, streak] = await Promise.all([
    readVault(deps.db, deps.visitorId, now),
    readStreak(deps.db, deps.visitorId, now),
  ]);
  const fx = effectsOn(deps.visitorId, url.searchParams.get("fx"));
  return page(vaultPage(vault, streak, now, opened, deps.stripeKey !== undefined, fx));
}

/** The dossier page, GET /dossier. */
export async function dossierGet(url: URL, deps: Deps): Promise<Response> {
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
        notice: dispatchNoticeFrom(url.searchParams.get("dispatch")),
      },
      streak,
      now,
      deps.stripeKey !== undefined,
    ),
  );
}
