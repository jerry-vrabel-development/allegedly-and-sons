-- The Agent Dossier (design note 0003, G1). Every visitor who earns something
-- becomes a Bureau agent: a number, a codename, and the badges and cards
-- they've earned. Keyed by the first-party visitor id; nothing personal.
-- Awards are granted only by the Worker, from events it recorded itself, so
-- they can't be claimed from the browser.

CREATE TABLE agents (
  agent_number INTEGER PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE CHECK (
    length(visitor_id) = 32 AND visitor_id NOT GLOB '*[^0-9a-f]*'
  ),
  codename TEXT NOT NULL CHECK (length(codename) BETWEEN 3 AND 60),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;

CREATE TABLE awards (
  visitor_id TEXT NOT NULL REFERENCES agents (visitor_id),
  -- A badge id ('case-closed') or a card ('card:<item slug>').
  award TEXT NOT NULL CHECK (length(award) BETWEEN 1 AND 80),
  earned_at INTEGER NOT NULL CHECK (earned_at >= 0),
  PRIMARY KEY (visitor_id, award)
) STRICT;
