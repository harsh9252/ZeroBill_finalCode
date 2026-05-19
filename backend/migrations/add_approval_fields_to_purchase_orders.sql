-- Migration to add 3-level approval workflow columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN level1_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN level2_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN level3_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN approved_by TEXT DEFAULT NULL,
ADD COLUMN action_by_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN action_by_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN action_at DATETIME DEFAULT NULL;
