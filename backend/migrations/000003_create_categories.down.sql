-- migrations/000003_create_categories.down.sql
--
-- Drop in reverse order of creation.
-- Indexes are dropped automatically when the table is dropped,
-- so we only need to DROP TABLE.

DROP TABLE IF EXISTS categories;