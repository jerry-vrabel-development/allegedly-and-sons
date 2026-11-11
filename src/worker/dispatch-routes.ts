/** The Bureau Dispatch's routes (design note 0007): register, email links, unsubscribe. */

import { normalizeEmail, TOKEN, UNSUBSCRIBE_TOKEN } from "../core/dispatch";
import { DISPATCH_SENT_PATH, DOSSIER_DISPATCH_PATH, DOSSIER_PATH } from "../core/paths";
import { visitorCookie } from "../core/visitor";
import type { Deps } from "./deps";
import {
  confirmRegistration,
  recoverFile,
  requestLink,
  unsubscribe,
  type Opened,
} from "./dispatch";
import {
  dispatchClosedPage,
  linkExpiredPage,
  linkPage,
  unsubscribedPage,
  type LinkKind,
} from "./dispatch-pages";
import {
  forbidden,
  formField,
  fromOwnSite,
  page,
  PRIVATE_PAGE_CACHE,
  returningVisitor,
  seeOther,
} from "./http";

/** An error's code (Email Service errors have one), never its message. */
function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "unknown";
}

/**
 * The Dispatch form: POST /dispatch with an email (design note 0007). Always
 * ends on the same "check your inbox" page, whatever was typed, and sends
 * after responding, so neither the page nor its timing says whether an
 * address is registered.
 */
export async function dispatchRegister(request: Request, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const { postalAddress, sendEmail } = deps;
  if (postalAddress === undefined || sendEmail === undefined) {
    return page(dispatchClosedPage(), 503);
  }
  const requester = returningVisitor(request, deps);
  if (requester === undefined) return seeOther(DOSSIER_DISPATCH_PATH);
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
export function linkLanding(url: URL, kind: LinkKind): Response {
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
export async function useLink(
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
 * Unsubscribe: the button on the unsubscribe page, or a mail app's one-click
 * POST to the List-Unsubscribe URL (RFC 8058, token in the query string). No
 * Origin check: mail providers post from their own servers, and the token is
 * the only thing that can unsubscribe anyone.
 */
export async function unsubscribePost(request: Request, deps: Deps): Promise<Response> {
  const token = new URL(request.url).searchParams.get("u") ?? (await formField(request, "u")) ?? "";
  if (!UNSUBSCRIBE_TOKEN.test(token)) return page(linkExpiredPage(), 404);
  await unsubscribe(deps.db, token, deps.nowSeconds());
  const response = page(unsubscribedPage());
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}
