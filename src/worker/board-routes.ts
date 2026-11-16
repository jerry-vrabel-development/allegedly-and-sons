/** The Job Board, GET /board (design note 0020). */

import type { Deps } from "./deps";
import { boardPage } from "./board-page";
import { readDossier } from "./dossier";
import { page } from "./http";

export async function boardGet(deps: Deps): Promise<Response> {
  const agent = await readDossier(deps.db, deps.visitorId);
  return page(boardPage(new Set(agent?.awards.map((award) => award.id) ?? [])));
}
