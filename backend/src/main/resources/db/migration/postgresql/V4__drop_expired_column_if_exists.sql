-- V3 dropped this column, but the production database still has it: an old
-- deploy that ran with ddl-auto=update and pre-V3 code re-created it after V3
-- had already been recorded as applied. The stale NOT NULL column makes every
-- INSERT into inventory_items fail, since the entity no longer maps it.
-- IF EXISTS makes this a safe no-op on databases that are already correct.
ALTER TABLE inventory_items DROP COLUMN IF EXISTS expired;
