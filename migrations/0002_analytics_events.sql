-- Analytics events (design note 0001). One row per event, recorded by the
-- Worker, so we can see which items and which lore sell, and where buyers came
-- from. Purchases are not copied here: the orders table, written only by the
-- verified Stripe webhook, is the purchase record, and the funnel joins it.
--
-- No raw IP addresses or user agents: they don't help sell anything and would
-- only be a liability if leaked. Cloudflare's country code covers "where".
-- Times are Unix seconds (UTC). STRICT tables reject wrongly typed values.

CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY,
  -- Every event the note plans, so later PRs never rebuild the table to widen this.
  event TEXT NOT NULL CHECK (
    event IN ('item_viewed', 'lore_expanded', 'share_clicked', 'shared_visit', 'checkout_started')
  ),
  item_slug TEXT NOT NULL CHECK (length(item_slug) BETWEEN 1 AND 64),
  ts INTEGER NOT NULL CHECK (ts >= 0),
  -- The first-party visitor cookie (a random id, set in the next PR). NULL until then,
  -- and for visitors without cookies.
  visitor_id TEXT CHECK (visitor_id IS NULL OR (length(visitor_id) = 32 AND visitor_id NOT GLOB '*[^0-9a-f]*')),
  referrer_host TEXT CHECK (referrer_host IS NULL OR length(referrer_host) BETWEEN 1 AND 253),
  -- Two-character code from Cloudflare (US, CA, ... and XX/T1 for unknown/Tor).
  country TEXT CHECK (country IS NULL OR length(country) = 2),
  utm_source TEXT CHECK (utm_source IS NULL OR length(utm_source) BETWEEN 1 AND 100),
  utm_campaign TEXT CHECK (utm_campaign IS NULL OR length(utm_campaign) BETWEEN 1 AND 100)
) STRICT;

-- Per-item funnels over a time range (the rollups and the dashboard).
CREATE INDEX analytics_events_by_item ON analytics_events (item_slug, event, ts);
-- One visitor's path: view → share → checkout → (orders) purchase.
CREATE INDEX analytics_events_by_visitor ON analytics_events (visitor_id, ts)
  WHERE visitor_id IS NOT NULL;
-- Retention: delete old raw events by time.
CREATE INDEX analytics_events_by_ts ON analytics_events (ts);
