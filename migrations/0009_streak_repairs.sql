-- "Grease the Clerk" (design note 0003, G4 PR 2): bought-back streaks. Each
-- row bridges the missed vault days from_day..to_day for one agent, so those
-- days no longer count as missed. Written only by the verified Stripe
-- webhook, in the same transaction as the order, once per Checkout Session.

CREATE TABLE streak_repairs (
  stripe_session_id TEXT PRIMARY KEY CHECK (stripe_session_id LIKE 'cs\_%' ESCAPE '\'),
  visitor_id TEXT NOT NULL CHECK (
    length(visitor_id) = 32 AND visitor_id NOT GLOB '*[^0-9a-f]*'
  ),
  from_day INTEGER NOT NULL CHECK (from_day >= 0),
  -- A repair covers a short gap: the window is two days, plus any freezes.
  to_day INTEGER NOT NULL CHECK (to_day >= from_day AND to_day - from_day < 10),
  repaired_at INTEGER NOT NULL CHECK (repaired_at >= 0)
) STRICT;

CREATE INDEX streak_repairs_by_visitor ON streak_repairs (visitor_id);
