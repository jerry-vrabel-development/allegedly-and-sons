import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { findItem, type Item } from "../src/core/catalog";
import { certificateStamps } from "../src/core/certificate";
import { sessionBuyer } from "../src/core/checkout";
import { awardsForOrder } from "../src/core/dossier";
import { findAwardId } from "../src/core/finds";
import { UNKNOWN_ITEM } from "../src/core/orders";
import { ALL_TIPS, tipAwardId, tipsAbout } from "../src/core/tips";
import { certificateBlock } from "../src/worker/certificate";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";

const BASE = "https://allegedly.example";
const SESSION = "cs_test_a11yKKR7hXrvzcygm0yPSkeMfUvWk0VFdP5MrIif8LmjHn4HGbMaJNRnLE";
const A = "a".repeat(32);
const B = "b".repeat(32);
const NOW = 1762531200;

// An exhibit with two tips. Tips are only told while an exhibit is on its way,
// so this stands in for one that has since gone on sale.
const SLUG = "martian-rubber-band";
const [FIRST, SECOND] = tipsAbout(SLUG);
const ALL_EXHIBITS_WITH_TIPS = [...new Set(ALL_TIPS.map((tip) => tip.exhibit))];

function item(slug: string): Item {
  const found = findItem(slug);
  if (found === undefined) throw new Error(`no item ${slug}`);
  return found;
}

describe("certificateStamps", () => {
  it("stamps the tips the agent holds about that exhibit, in the order they are told", () => {
    expect(FIRST).toBeDefined();
    expect(SECOND).toBeDefined();
    if (FIRST === undefined || SECOND === undefined) return;
    expect(certificateStamps(SLUG, new Set())).toEqual([]);
    expect(certificateStamps(SLUG, new Set([tipAwardId(SECOND)]))).toEqual([SECOND]);
    expect(certificateStamps(SLUG, new Set([tipAwardId(SECOND), tipAwardId(FIRST)]))).toEqual([
      FIRST,
      SECOND,
    ]);
  });

  it("ignores tips about other exhibits, and awards that aren't tips", () => {
    const other = ALL_EXHIBITS_WITH_TIPS.find((slug) => slug !== SLUG) ?? "";
    const held = new Set([
      ...tipsAbout(other).map(tipAwardId),
      findAwardId("loose-brick"),
      "acquirer",
      `card:${SLUG}`,
    ]);
    expect(certificateStamps(SLUG, held)).toEqual([]);
  });

  it("is empty for an exhibit nobody wrote tips about", () => {
    expect(tipsAbout("alien-paperclip")).toEqual([]);
    expect(certificateStamps("alien-paperclip", new Set(["anything"]))).toEqual([]);
  });

  it("is never a bonus for paying: an order grants no tips", () => {
    for (const slug of ALL_EXHIBITS_WITH_TIPS) {
      expect(
        awardsForOrder(slug).some((award) => award.startsWith("tip:")),
        slug,
      ).toBe(false);
    }
  });
});

describe("sessionBuyer", () => {
  it("reads a well-formed client_reference_id and nothing else", () => {
    expect(sessionBuyer({ client_reference_id: A })).toBe(A);
    for (const value of [
      null,
      "x",
      {},
      { client_reference_id: null },
      { client_reference_id: 5 },
      { client_reference_id: "A".repeat(32) },
      { client_reference_id: "a".repeat(31) },
      { client_reference_id: `${"a".repeat(31)}<` },
    ]) {
      expect(sessionBuyer(value), JSON.stringify(value)).toBeUndefined();
    }
  });
});

describe("certificateBlock", () => {
  it("lists each stamp in words: Witnessed, the contact, and their line", () => {
    if (FIRST === undefined || SECOND === undefined) return;
    const html = certificateBlock(item(SLUG), [FIRST, SECOND], "h2").value;
    expect(html).toContain(`<h2 id="certificate-${SLUG}">Bureau Certificate No. AS-`);
    expect(html).toContain("<strong>Authenticity:</strong> Allegedly.");
    expect(html.match(/<span class="stamp">Witnessed<\/span>/g)).toHaveLength(2);
    expect(html).toContain(`<strong>${FIRST.contact}</strong>`);
    expect(html).toContain("Gerald is not a notary.");
  });

  it("says plainly when there is nothing to stamp", () => {
    const html = certificateBlock(item(SLUG), [], "h3").value;
    expect(html).toContain(`<h3 id="certificate-${SLUG}">`);
    expect(html).toContain("No finds on file for this exhibit");
    expect(html).not.toContain('class="stamp"');
  });

  it("adds no figure, so a page keeps its one data-host", () => {
    if (FIRST === undefined) return;
    expect(certificateBlock(item(SLUG), [FIRST], "h2").value).not.toContain("data-host");
  });
});

/** Router deps: a fake Stripe that answers with a paid session for SLUG, bought by `buyer`. */
function deps(visitorId: string | null, buyer: string | null = A): Deps {
  const session = {
    id: SESSION,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    metadata: { slug: SLUG },
    ...(buyer === null ? {} : { client_reference_id: buyer }),
  };
  return {
    stripeKey: "sk_test_fake",
    webhookSecret: undefined,
    fetch: () => Promise.resolve(Response.json(session)),
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId,
    access: undefined,
  };
}

async function text(path: string, d: Deps): Promise<string> {
  const response = await route(new Request(`${BASE}${path}`), d);
  expect(response.status).toBe(200);
  return response.text();
}

async function order(
  session: string,
  visitor: string,
  slug: string,
  status: string,
  paidAt: number,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO orders (stripe_session_id, item_slug, amount_cents, paid_at, visitor_id, status)
     VALUES (?, ?, 1000, ?, ?, ?)`,
  )
    .bind(session, slug, paidAt, visitor, status)
    .run();
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
    env.DB.prepare("DELETE FROM orders"),
  ]);
  if (FIRST !== undefined) await grantAwards(env.DB, A, [tipAwardId(FIRST)], NOW);
});

describe("GET /thanks, the buyer's certificate", () => {
  it("shows the buyer the tips they held, stamped", async () => {
    if (FIRST === undefined || SECOND === undefined) return;
    const page = await text(`/thanks?session_id=${SESSION}`, deps(A));
    expect(page).toContain("Acquisition recorded");
    expect(page).toContain(`id="certificate-${SLUG}"`);
    expect(page.match(/<span class="stamp">Witnessed<\/span>/g)).toHaveLength(1);
    expect(page).toContain(`<strong>${FIRST.contact}</strong>`);
    expect(page).not.toContain(`<strong>${SECOND.contact}</strong>`);
  });

  it("shows a certificate with nothing stamped to a buyer who heard no tips", async () => {
    const page = await text(`/thanks?session_id=${SESSION}`, deps(B, B));
    expect(page).toContain(`id="certificate-${SLUG}"`);
    expect(page).toContain("No finds on file for this exhibit");
  });

  it("shows no certificate to anyone but the buyer, and none without a buyer", async () => {
    for (const [visitor, buyer] of [
      [B, A],
      [null, A],
      [A, null],
    ] as const) {
      const page = await text(`/thanks?session_id=${SESSION}`, deps(visitor, buyer));
      expect(page, `${String(visitor)}/${String(buyer)}`).toContain("Acquisition recorded");
      expect(page, `${String(visitor)}/${String(buyer)}`).not.toContain(`id="certificate-${SLUG}"`);
    }
  });
});

describe("GET /dossier, Certificates", () => {
  it("has no Certificates section for an agent who hasn't acquired anything", async () => {
    expect(await text("/dossier", deps(A))).not.toContain("certificates-heading");
  });

  it("shows one certificate per exhibit kept, with its stamps, oldest first", async () => {
    if (FIRST === undefined) return;
    await order("cs_test_two", A, "alien-paperclip", "paid", NOW + 10);
    await order("cs_test_one", A, SLUG, "shipped", NOW);
    await order("cs_test_again", A, SLUG, "paid", NOW + 20);
    const page = await text("/dossier", deps(A));
    expect(page).toContain('<h2 id="certificates-heading">Certificates</h2>');
    expect(page.match(new RegExp(`id="certificate-${SLUG}"`, "g"))).toHaveLength(1);
    expect(page.indexOf(`certificate-${SLUG}`)).toBeLessThan(
      page.indexOf("certificate-alien-paperclip"),
    );
    expect(page).toContain(`<strong>${FIRST.contact}</strong>`);
    expect(page).toContain("No finds on file for this exhibit");
  });

  it("leaves out refunded orders, other agents' orders and unknown items", async () => {
    await order("cs_test_refunded", A, SLUG, "refunded", NOW);
    await order("cs_test_theirs", B, "alien-paperclip", "paid", NOW);
    await order("cs_test_mystery", A, UNKNOWN_ITEM, "paid", NOW);
    expect(await text("/dossier", deps(A))).not.toContain('id="certificate-');
  });
});
