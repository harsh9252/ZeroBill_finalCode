-- Add remark column to sales_returns table
ALTER TABLE sales_returns ADD COLUMN remark LONGTEXT NULL AFTER po_agreement_number;

-- Add remark column to delivery_challans table
ALTER TABLE delivery_challans ADD COLUMN remark LONGTEXT NULL AFTER po_agreement_number;

-- Add remark column to book_purchase_orders table
ALTER TABLE book_purchase_orders ADD COLUMN remark LONGTEXT NULL AFTER po_agreement_number;

-- Add remark column to book_invoices table
ALTER TABLE book_invoices ADD COLUMN remark LONGTEXT NULL AFTER bank_id;
