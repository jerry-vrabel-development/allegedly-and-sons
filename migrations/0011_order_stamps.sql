-- Gerald's stamps on the paper certificate (design note 0021, part 2).
--
-- When the webhook records an order, it copies the tips the buyer held about
-- that exhibit, as they were worded, so the certificate packed with the
-- exhibit is fixed at the moment of purchase. Only tips earned at or before
-- the payment count, so a late or redelivered webhook stamps the same thing.
-- Shop content only: no names, emails or addresses (note 0001).

CREATE TABLE order_stamps (
  stripe_session_id TEXT NOT NULL REFERENCES orders (stripe_session_id) ON DELETE CASCADE,
  -- The tip's award id, tip:<exhibit>:<n> (note 0020).
  award TEXT NOT NULL CHECK (award LIKE 'tip:%' AND length(award) <= 80),
  -- Which of the exhibit's tips it is, so the certificate keeps their order.
  n INTEGER NOT NULL CHECK (n >= 1),
  contact TEXT NOT NULL CHECK (length(contact) BETWEEN 1 AND 60),
  line TEXT NOT NULL CHECK (length(line) BETWEEN 1 AND 300),
  PRIMARY KEY (stripe_session_id, award)
) STRICT;
