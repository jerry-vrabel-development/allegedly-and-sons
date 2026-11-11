import { LEDGER_PATH } from "../core/paths";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "./access";
import type { Deps } from "./deps";
import { page } from "./http";
import { periodFrom, readLedger } from "./ledger";
import { ledgerPage } from "./ledger-page";
import { notFoundPage } from "./pages";

/**
 * The private ledger: GET /bureau/ledger. Cloudflare Access guards /bureau;
 * this checks Access's signed token too, so a misconfigured Access rule fails
 * closed. Without a valid token, /bureau/* is simply not found.
 */
export async function bureau(request: Request, pathname: string, deps: Deps): Promise<Response> {
  const identity = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER), deps);
  if (identity === undefined || pathname !== LEDGER_PATH) return page(notFoundPage(), 404);
  const url = new URL(request.url);
  const ledger = await readLedger(deps.db, periodFrom(url), deps.nowSeconds(), url.hostname);
  const response = page(ledgerPage(ledger, identity.email));
  response.headers.set("Cache-Control", "private, no-store, no-transform");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
