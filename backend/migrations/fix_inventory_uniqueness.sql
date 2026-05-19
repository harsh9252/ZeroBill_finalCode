-- Migration: Fix Inventory Item Uniqueness
-- Description: Drop global unique constraint on item_code and scope it per business_id

-- 1. Drop the existing global unique index
-- Using DROP INDEX if it exists (MySQL 8.0+) or just DROP INDEX
-- From our check, the index name is 'item_code'
ALTER TABLE inventory DROP INDEX item_code;

-- 2. Add the business-scoped unique index
ALTER TABLE inventory ADD UNIQUE KEY unique_business_item_code (business_id, item_code);

-- 3. Verify indexes (optional but good for logs)
SHOW INDEX FROM inventory;
