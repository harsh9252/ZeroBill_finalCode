const { pool } = require('../config/database');

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS inventory_stock_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        inventory_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        action_type VARCHAR(50) NOT NULL DEFAULT 'ADD',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(createTableQuery);
    console.log("inventory_stock_history table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
}

createTable();
