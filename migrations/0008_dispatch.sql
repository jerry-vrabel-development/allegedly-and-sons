-- The Bureau Dispatch, part 1 (design note 0007): registration and recovery.
--
-- dispatch_agents holds only confirmed registrations (an address waiting to
-- be confirmed lives only in its one-time token). One address per file, one
-- file per address. Addresses are stored nowhere else.

CREATE TABLE dispatch_agents (
  visitor_id TEXT PRIMARY KEY REFERENCES agents (visitor_id),
  email TEXT NOT NULL UNIQUE CHECK (
    length(email) BETWEEN 3 AND 254 AND email = lower(email) AND email LIKE '%_@_%'
  ),
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'unsubscribed')),
  confirmed_at INTEGER NOT NULL CHECK (confirmed_at >= 0),
  unsubscribed_at INTEGER CHECK (unsubscribed_at >= 0),
  -- Random, in every email's unsubscribe link. It only allows unsubscribing.
  unsubscribe_token TEXT NOT NULL UNIQUE CHECK (
    length(unsubscribe_token) = 32 AND unsubscribe_token NOT GLOB '*[^0-9a-f]*'
  )
) STRICT;

-- One-time links. Only the SHA-256 of each token is kept, so a copy of the
-- database can't be used to confirm or recover anything.
CREATE TABLE dispatch_tokens (
  token_hash TEXT PRIMARY KEY CHECK (
    length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'
  ),
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm', 'recover')),
  -- Whose file the link is for.
  visitor_id TEXT NOT NULL CHECK (
    length(visitor_id) = 32 AND visitor_id NOT GLOB '*[^0-9a-f]*'
  ),
  -- The browser that asked (for the per-browser limit).
  requested_by TEXT NOT NULL CHECK (length(requested_by) = 32),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  used_at INTEGER CHECK (used_at >= 0)
) STRICT;

CREATE INDEX dispatch_tokens_by_email ON dispatch_tokens (email, created_at);

CREATE INDEX dispatch_tokens_by_requester ON dispatch_tokens (requested_by, created_at);

CREATE INDEX dispatch_tokens_by_time ON dispatch_tokens (created_at);
