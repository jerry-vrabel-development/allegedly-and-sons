/**
 * The duty-streak panel on /vault and /dossier (design note 0003, G4).
 *
 * Built for loss aversion, in the shop's black-market voice: what's at stake
 * and how long is left, said in words (never color alone). Every number is
 * real: the deadline is midnight UTC, the streak and freezes come from the
 * agent's actual pulls.
 */

import {
  FREEZE_EVERY,
  MAX_FREEZES,
  MILESTONES,
  nextMilestone,
  repairDeadline,
  type Streak,
} from "../core/streak";
import { REPAIR_NAME, REPAIR_PATH, REPAIR_PRICE_CENTS } from "../core/repair";
import { formatPrice } from "../core/catalog";
import { describeWait, nextDailyAt } from "../core/vault";
import { TERMS_PATH } from "./pages";
import { html, type SafeHtml } from "./html";

function plural(n: number, unit: string): string {
  return `${String(n)} ${unit}${n === 1 ? "" : "s"}`;
}

function freezes(streak: Streak): SafeHtml {
  return html`<p>Freezes held: ${String(streak.freezes)} of ${String(MAX_FREEZES)}.</p>`;
}

function milestoneLine(streak: Streak): SafeHtml {
  const reached = MILESTONES.find((milestone) => milestone.days === streak.days);
  const next = nextMilestone(streak.days);
  return html`${
    reached === undefined || streak.status !== "safe"
      ? html``
      : html`<p>
          <strong>Day ${String(reached.days)}: you're ${reached.name}.</strong> A bonus pull is
          yours.
        </p>`
  }
  ${
    next === undefined
      ? html`<p>Every milestone taken. Keep the streak alive anyway; the Bureau is watching.</p>`
      : html`<p>${plural(next.days - streak.days, "more day")} to ${next.name}.</p>`
  }`;
}

const DAY_SECONDS = 86_400;

/**
 * "Grease the Clerk": the buy-back offer for a streak that just died, with
 * its real price and real deadline in plain words beside the button.
 * `secondsLeft` is how long the offer has; `pulledToday` is whether today's
 * pull is already made (it then becomes the restored streak's next day).
 */
function repairOffer(streak: Streak, secondsLeft: number, pulledToday: boolean): SafeHtml {
  const price = formatPrice(REPAIR_PRICE_CENTS);
  // The window is two days, so on its last day the deadline is tonight.
  const when = secondsLeft <= DAY_SECONDS ? "tonight" : "tomorrow";
  return html`<div class="repair">
    <p>
      <strong>${REPAIR_NAME}.</strong> The clerk can be persuaded to lose some paperwork. Bring your
      ${String(streak.lost)}-day streak back for ${price}. The offer ends at midnight UTC ${when}:
      ${describeWait(secondsLeft)} left.
    </p>
    <form class="lever" method="post" action="${REPAIR_PATH}">
      <button class="button" type="submit">Restore my streak for ${price}</button>
    </form>
    <p class="small-print">
      One-time card payment through Stripe. It restores the days you missed;
      ${
        pulledToday
          ? html`today's pull then counts as the next day.`
          : html`today's pull is still yours to make.`
      }
      It's digital, so it can't be refunded once applied.
      <a href="${TERMS_PATH}">Terms of sale</a>.
    </p>
  </div>`;
}

/**
 * The panel. `onVault` swaps the call to action for the lever that's already
 * on the page; `repairOpen` is whether checkout is configured for buy-backs.
 */
export function streakPanel(
  streak: Streak,
  nowSeconds: number,
  onVault: boolean,
  repairOpen: boolean,
): SafeHtml {
  const deadline = repairDeadline(streak);
  const offer = repairOpen && deadline !== undefined && nowSeconds < deadline;
  const wait = describeWait(nextDailyAt(nowSeconds) - nowSeconds);
  // Words for everyone; the countdown script (on the Vault) ticks it live.
  const secondsLeft = String(nextDailyAt(nowSeconds) - nowSeconds);
  // prettier-ignore
  const clock = html`<span class="clock" data-seconds-left="${secondsLeft}">${wait}</span>`;
  const goPull = onVault
    ? html``
    : html`<p><a class="button" href="/vault">Pull the lever before it's gone</a></p>`;

  let body: SafeHtml;
  if (streak.status === "safe") {
    body = html`<p class="streak-count">
        <strong>Duty streak: ${plural(streak.days, "day")}.</strong> Safe until midnight UTC.
      </p>
      ${freezes(streak)} ${milestoneLine(streak)}
      ${
        offer
          ? html`<p>
                <strong>Your ${String(streak.lost)}-day streak is still dead.</strong> Today's pull
                started a new one.
              </p>
              ${repairOffer(streak, deadline - nowSeconds, true)}`
          : html``
      }`;
  } else if (streak.status === "due") {
    body = html`<p class="streak-count streak-due">
        <strong>Your ${String(streak.days)}-day streak dies at midnight UTC: ${clock} left.</strong>
        Walk away now and it dies with you.
      </p>
      ${
        streak.covering === 0
          ? html``
          : html`<p>
              You missed ${streak.covering === 1 ? "yesterday" : plural(streak.covering, "day")}.
              ${streak.covering === 1 ? "A freeze" : "Freezes"} covered for you. Don't make a habit
              of it.
            </p>`
      }
      ${freezes(streak)} ${milestoneLine(streak)} ${goPull}`;
  } else if (streak.lost > 0) {
    body = html`<p class="streak-count">
        <strong>Your ${String(streak.lost)}-day streak is dead.</strong> Nobody held the line.
        ${offer ? html`` : html`Start a new one today.`}
      </p>
      ${offer ? repairOffer(streak, deadline - nowSeconds, false) : goPull}`;
  } else {
    body = html`<p>
        Pull the lever on consecutive days to build a duty streak. Every ${String(FREEZE_EVERY)}
        days earns a freeze that covers a missed day, and milestones at
        ${MILESTONES.map((m) => String(m.days)).join(", ")} days each earn a badge and a bonus pull.
      </p>
      ${goPull}`;
  }

  return html`<section class="prose streak" aria-labelledby="streak-heading">
    <h2 id="streak-heading">Duty streak</h2>
    ${body}
  </section>`;
}
