-- 'expired' is now computed from expiry_date at read time. The stored flag was
-- only refreshed when a row happened to be updated, so it went stale for items
-- that expired while untouched.
ALTER TABLE inventory_items DROP COLUMN expired;
