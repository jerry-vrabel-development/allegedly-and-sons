-- Which visitor placed each order (design note 0001, C2). Checkout passes the
-- visitor cookie's id to Stripe as client_reference_id; the webhook stores it
-- here, so an order can be joined to the views, shares and checkouts before it.
-- NULL for older orders and for buyers without the cookie.

ALTER TABLE orders ADD COLUMN visitor_id TEXT CHECK (
  visitor_id IS NULL OR (length(visitor_id) = 32 AND visitor_id NOT GLOB '*[^0-9a-f]*')
);

CREATE INDEX orders_by_visitor ON orders (visitor_id) WHERE visitor_id IS NOT NULL;
