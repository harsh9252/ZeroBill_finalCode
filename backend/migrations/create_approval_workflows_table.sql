-- Migration to create approval_workflows table and add approver_sequence to PO & PR tables

CREATE TABLE IF NOT EXISTS approval_workflows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'purchase_order' or 'purchase_requisition'
    level_number INT NOT NULL,          -- 1, 2, 3, etc.
    approver_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_level (business_id, document_type, level_number)
);

-- Add approver_sequence column to purchase_orders table if not exists
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approver_sequence TEXT DEFAULT NULL;

-- Add approver_sequence column to purchase_requisitions table if not exists
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS approver_sequence TEXT DEFAULT NULL;
