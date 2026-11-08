-- Share tracking (design note 0001, C3). A share_clicked event carries the
-- network (channel) and a random ref code; the shared link carries ?r=<ref>,
-- and a visit through it records shared_visit with the same ref. Joining on
-- ref gives shares → return visits → (by visitor) orders, per item and network.

ALTER TABLE analytics_events ADD COLUMN ref TEXT CHECK (
  ref IS NULL OR (length(ref) = 10 AND ref NOT GLOB '*[^0-9a-f]*')
);

ALTER TABLE analytics_events ADD COLUMN channel TEXT CHECK (
  channel IS NULL OR channel IN ('bluesky', 'x', 'facebook', 'reddit', 'email')
);

CREATE INDEX analytics_events_by_ref ON analytics_events (ref) WHERE ref IS NOT NULL;
