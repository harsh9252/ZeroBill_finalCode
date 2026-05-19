ALTER TABLE project_expense ADD COLUMN category VARCHAR(255) DEFAULT NULL;
ALTER TABLE project_expense_transactions ADD COLUMN category VARCHAR(255) DEFAULT NULL;
