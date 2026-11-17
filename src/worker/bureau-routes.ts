import { LEDGER_PATH, PACKING_PATH } from "../core/paths";
import { readToPack } from "./certificate-store";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "./access";
import type { Deps } from "./deps";
import { page } from "./http";
import { periodFrom, readLedger } from "./ledger";
import { ledgerPage } from "./ledger-page";
import { packingPage } from "./packing-page";
import { notFoundPage } from "./pages";

/**
 * The private pages: GET /bureau/ledger and GET /bureau/packing (the
 * certificates to print for orders waiting to ship). Cloudflare Access guards /bureau;
 * this checks Access's signed token too, so a misconfigured Access rule fails
 * closed. Without a valid token, /bureau/* is simply not found.
 */
export async function bureau(request: Request, pathname: string, deps: Deps): Promise<Response> {
  const identity = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER), deps);
  if (identity === undefined) return page(notFoundPage(), 404);
  let response: Response;
  if (pathname === LEDGER_PATH) {
    const url = new URL(request.url);
    const ledger = await readLedger(deps.db, periodFrom(url), deps.nowSeconds(), url.hostname);
    response = page(ledgerPage(ledger, identity.email));
  } else if (pathname === PACKING_PATH) {
    response = page(packingPage(await readToPack(deps.db)));
  } else {
    return page(notFoundPage(), 404);
  }
  response.headers.set("Cache-Control", "private, no-store, no-transform");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
