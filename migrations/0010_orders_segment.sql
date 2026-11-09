-- The Back-Room Broadcast (design note 0009): which on-air segment sold an
-- order, from the Checkout Session's metadata. NULL for orders bought off air
-- (and for every order before this). The Ledger compares on-air and off-air.

ALTER TABLE orders ADD COLUMN segment TEXT CHECK (
  segment IS NULL OR (length(segment) BETWEEN 12 AND 20 AND segment GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].*')
);

CREATE INDEX orders_by_segment ON orders (segment) WHERE segment IS NOT NULL;
