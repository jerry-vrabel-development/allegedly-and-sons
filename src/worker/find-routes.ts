/**
 * Finds (design note 0018): POST /find/<id> records one, and GET /find/<id>
 * shows who you met. Only the Worker grants the award, and only to a
 * returning visitor who isn't a bot, like the Vault lever. A find is free,
 * cosmetic and idempotent: pressing the same one again changes nothing.
 */

import { findAwardId, findById, findPathFor } from "../core/finds";
import type { Deps } from "./deps";
import { grantAwards, readDossier } from "./dossier";
import { findPage } from "./find-pages";
import { forbidden, fromOwnSite, page, returningVisitor, seeOther } from "./http";
import { notFoundPage } from "./pages";

export async function findPress(request: Request, id: string, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const find = findById(id);
  if (find === undefined) return page(notFoundPage(), 404);
  const visitorId = returningVisitor(request, deps);
  // A first visit or a bot gets nothing recorded, and goes back where it was.
  if (visitorId === undefined) return seeOther(find.from);
  await grantAwards(deps.db, visitorId, [findAwardId(find.id)], deps.nowSeconds());
  return seeOther(findPathFor(find.id));
}

export async function findRead(id: string, deps: Deps): Promise<Response> {
  const find = findById(id);
  if (find === undefined) return page(notFoundPage(), 404);
  const agent = await readDossier(deps.db, deps.visitorId);
  const held = agent?.awards.some((award) => award.id === findAwardId(find.id)) ?? false;
  return held ? page(findPage(find)) : page(notFoundPage(), 404);
}
