/**
 * A tip, as the Vault shows it under a pull (note 0020): who said it, what
 * it is about, and a way on to the Job Board. A tip is a clue, never a claim,
 * and the words around it say so.
 */

import { itemPathFor, JOB_BOARD_PATH } from "../core/paths";
import { tipExhibit, type Tip } from "../core/tips";
import { html, type SafeHtml } from "./html";

export function tipBlock(tip: Tip | undefined): SafeHtml {
  if (tip === undefined) {
    return html`<h4>A tip</h4>
      <p>
        No exhibit is on its way right now, so this pull has no tip. The
        <a href="${JOB_BOARD_PATH}">Job Board</a> says what is on the block.
      </p>`;
  }
  const exhibit = tipExhibit(tip);
  return html`<h4>A tip</h4>
    <p class="kicker">
      ${tip.contact}, about <a href="${itemPathFor(exhibit.slug)}">${exhibit.name}</a>
    </p>
    <p class="tip-line">${tip.line}</p>
    <p>
      A tip is a clue, not a promise. See what else is on its way on the
      <a href="${JOB_BOARD_PATH}">Job Board</a>.
    </p>`;
}
