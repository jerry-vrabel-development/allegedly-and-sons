-- The Vault Lever (design note 0003, G2). One row per pull. The free pull is
-- one a day per agent (the partial unique index enforces it, so two quick
-- presses can't both win); bonus pulls are checked against the commendations
-- that earn them in the same statement that records the pull. The card drawn
-- is also granted as an award ('vault:<card>') in the dossier.

CREATE TABLE vault_pulls (
  id INTEGER PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES agents (visitor_id),
  -- Whole UTC days since 1970: the free pull resets at midnight UTC.
  day INTEGER NOT NULL CHECK (day >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'bonus')),
  card TEXT NOT NULL CHECK (length(card) BETWEEN 1 AND 60),
  pulled_at INTEGER NOT NULL CHECK (pulled_at >= 0)
) STRICT;

CREATE UNIQUE INDEX vault_pulls_one_daily ON vault_pulls (visitor_id, day) WHERE kind = 'daily';

CREATE INDEX vault_pulls_by_visitor ON vault_pulls (visitor_id, id);

CREATE INDEX vault_pulls_by_time ON vault_pulls (pulled_at);
