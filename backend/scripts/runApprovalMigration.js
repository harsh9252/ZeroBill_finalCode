const { pool } = require('../config/database');

const runMigration = async () => {
  console.log('Starting Approval Workflow database migration...');

  try {
    // 1. Create approval_workflows table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS approval_workflows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        level_number INT NOT NULL,
        approver_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_level (business_id, document_type, level_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createTableQuery);
    console.log('✓ approval_workflows table checked/created successfully.');

    // 2. Add approver_sequence to purchase_orders table if not exists
    const [poColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_orders' 
      AND COLUMN_NAME = 'approver_sequence'
    `);
    
    if (poColumns.length === 0) {
      await pool.query(`
        ALTER TABLE purchase_orders 
        ADD COLUMN approver_sequence TEXT DEFAULT NULL
      `);
      console.log('✓ Column approver_sequence added to purchase_orders table.');
    } else {
      console.log('✓ Column approver_sequence already exists in purchase_orders table.');
    }

    // 3. Add approver_sequence to purchase_requisitions table if not exists
    const [prColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_requisitions' 
      AND COLUMN_NAME = 'approver_sequence'
    `);

    if (prColumns.length === 0) {
      await pool.query(`
        ALTER TABLE purchase_requisitions 
        ADD COLUMN approver_sequence TEXT DEFAULT NULL
      `);
      console.log('✓ Column approver_sequence added to purchase_requisitions table.');
    } else {
      console.log('✓ Column approver_sequence already exists in purchase_requisitions table.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
    console.log('Database pool closed.');
  }
};

runMigration();
