-- Story reads (design note 0001, C4). lore_expanded records how far a visitor
-- got into an item's case file: 'opened' when they open "Keep reading", and
-- 'finished' when the last paragraph has stayed on screen for a few seconds.
-- A column rather than a new event name, so the table never needs rebuilding.

ALTER TABLE analytics_events ADD COLUMN read_depth TEXT CHECK (
  read_depth IS NULL OR read_depth IN ('opened', 'finished')
);
