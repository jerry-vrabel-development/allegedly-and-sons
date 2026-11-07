-- Orders, recorded only by the verified Stripe webhook (design note 0004).
--
-- Privacy (note 0001): no names, emails or addresses here. Stripe holds the
-- buyer's details; fulfillment reads the shipping address from Stripe.
-- Times are Unix seconds (UTC). STRICT tables reject wrongly typed values.

-- Every Stripe event id we've processed, so a redelivered event does nothing.
CREATE TABLE stripe_events (
  id TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'evt\_%' ESCAPE '\'),
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
) STRICT;

-- One row per paid Checkout Session. Stripe stays the authority on money.
CREATE TABLE orders (
  stripe_session_id TEXT NOT NULL PRIMARY KEY CHECK (stripe_session_id LIKE 'cs\_%' ESCAPE '\'),
  payment_intent_id TEXT CHECK (payment_intent_id IS NULL OR payment_intent_id LIKE 'pi\_%' ESCAPE '\'),
  item_slug TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'shipped', 'refunded')),
  paid_at INTEGER NOT NULL,
  shipped_at INTEGER,
  CHECK (shipped_at IS NULL OR shipped_at >= paid_at)
) STRICT;

-- The fulfillment list: unshipped orders, oldest first.
CREATE INDEX orders_by_status_and_paid_at ON orders (status, paid_at);
