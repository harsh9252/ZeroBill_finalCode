const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get promise-based connection
const promisePool = pool.promise();

// Set STRICT mode for all connections
pool.on('connection', (connection) => {
  connection.query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'", (error) => {
    if (error) {

    }
  });
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();

    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

// Create database if not exists
const createDatabase = async () => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    const promiseConnection = connection.promise();

    await promiseConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`
    );

    connection.end();
  } catch (error) {

  }
};

// Create users table
const createUsersTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create proforma invoices table (added because it was missing in initializeDatabase)
const createProformaInvoicesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS proforma_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        proforma_number VARCHAR(50) NOT NULL,
        proforma_date DATE NOT NULL,
        updated_date DATE,
        party_name VARCHAR(255) NOT NULL,
        party_id INT,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0.00,
        discount_amount DECIMAL(15, 2) DEFAULT 0.00,
        tax_amount DECIMAL(15, 2) DEFAULT 0.00,
        grand_total DECIMAL(15, 2) DEFAULT 0.00,
        notes TEXT,
        valid_until DATE,
        created_by INT NOT NULL,
        invoice_data JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        bank_id INT,
        terms_id INT,
        quotation_id INT,

        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        FOREIGN KEY (terms_id) REFERENCES terms_conditions(id) ON DELETE SET NULL,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
        UNIQUE KEY unique_proforma_number (business_id, proforma_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create sales invoices table (added because it was missing in initializeDatabase)
const createSalesInvoicesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        invoice_number VARCHAR(50) NOT NULL,
        invoice_date DATE NOT NULL,
        updated_date DATE,
        party_name VARCHAR(255) NOT NULL,
        party_id INT,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        due_date DATE,
        status ENUM('open', 'closed', 'cancelled', 'paid', 'overdue') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0.00,
        discount_amount DECIMAL(15, 2) DEFAULT 0.00,
        tax_amount DECIMAL(15, 2) DEFAULT 0.00,
        grand_total DECIMAL(15, 2) DEFAULT 0.00,
        notes TEXT,
        created_by INT NOT NULL,
        invoice_data JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        bank_id INT,
        terms_id INT,
        quotation_id INT,
        proforma_id INT,
        irn VARCHAR(64),
        einvoice_status ENUM('not_applicable','pending','generated','cancelled') DEFAULT 'not_applicable',

        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        FOREIGN KEY (terms_id) REFERENCES terms_conditions(id) ON DELETE SET NULL,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
        FOREIGN KEY (proforma_id) REFERENCES proforma_invoices(id) ON DELETE SET NULL,
        UNIQUE KEY unique_invoice_number (business_id, invoice_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create billing_history table
const createBillingTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS billing_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        reference_number VARCHAR(100) NOT NULL,
        payment_status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
        billing_period_start DATE,
        billing_period_end DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at),
        INDEX idx_billing_period (billing_period_start, billing_period_end)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);

    // Insert sample data if table is empty and users exist
    const [existingData] = await promisePool.query(
      'SELECT COUNT(*) as count FROM billing_history'
    );

    if (existingData[0].count === 0) {
      // Check if any users exist first
      const [userCount] = await promisePool.query(
        'SELECT COUNT(*) as count FROM users'
      );

      if (userCount[0].count > 0) {
        // Get the first user ID
        const [firstUser] = await promisePool.query(
          'SELECT id FROM users ORDER BY id ASC LIMIT 1'
        );

        if (firstUser.length > 0) {
          const userId = firstUser[0].id;

          const insertSampleData = `
            INSERT INTO billing_history (
              user_id,
              plan_type,
              amount,
              currency,
              payment_method,
              transaction_id,
              reference_number,
              payment_status,
              billing_period_start,
              billing_period_end,
              description,
              created_at
            ) VALUES
            (?, 'Platinum', 3539.00, 'INR', 'upi', 'TXN123456789', 'IBB/25-26/64619', 'success', '2024-11-04', '2025-11-04', 'Annual Platinum Plan Subscription', '2024-11-04 10:30:00'),
            (?, 'Premium', 2499.00, 'INR', 'credit_card', 'TXN987654321', 'IBB/24-25/52341', 'success', '2023-11-04', '2024-11-04', 'Annual Premium Plan Subscription', '2023-11-04 14:15:00'),
            (?, 'Basic', 999.00, 'INR', 'net_banking', 'TXN456789123', 'IBB/23-24/38912', 'success', '2022-11-04', '2023-11-04', 'Annual Basic Plan Subscription', '2022-11-04 09:45:00');
          `;

          await promisePool.query(insertSampleData, [userId, userId, userId]);
        }
      }
    }
  } catch (error) {

  }
};

// Create businesses table
const createBusinessesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100),
        industry_type VARCHAR(100),
        business_registration_type VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        gstin VARCHAR(20),
        pan VARCHAR(20),
        website VARCHAR(255),
        logo_url VARCHAR(500),
        signature_url VARCHAR(500),
        stamp_url VARCHAR(500),
        comment TEXT,
        msme_number VARCHAR(50),
        cin_number VARCHAR(50),
        tan_number VARCHAR(50),
        udyam_number VARCHAR(50),
        import_export_code VARCHAR(50),
        fssai_number VARCHAR(50),
        drug_license_number VARCHAR(50),
        tax_type ENUM('GST', 'VAT', 'No') DEFAULT 'No',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_business_name (business_name),
        INDEX idx_gstin (gstin)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

const createBankDetailsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bank_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT,
        party_id INT,
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        ifsc VARCHAR(20),
        branch VARCHAR(255),
        upi VARCHAR(255),
        account_holder_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_bank_name (bank_name),
        INDEX idx_account_number (account_number),
        UNIQUE KEY unique_business_account (business_id, account_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create quotations table
const createQuotationsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        quotation_number VARCHAR(50) NOT NULL,
        quotation_date DATE NOT NULL,
        updated_date DATE,
        party_name VARCHAR(255) NOT NULL,
        party_id INT,
        bank_id INT,
        terms_id INT DEFAULT NULL,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0.00,
        discount_amount DECIMAL(15, 2) DEFAULT 0.00,
        tax_amount DECIMAL(15, 2) DEFAULT 0.00,
        grand_total DECIMAL(15, 2) DEFAULT 0.00,
        notes TEXT,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        valid_until DATE,
        created_by INT NOT NULL,
        quotation_data JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_quotation_number (business_id, quotation_number),
        INDEX idx_business_id (business_id),
        INDEX idx_quotation_number (quotation_number),
        INDEX idx_status (status),
        INDEX idx_party_name (party_name),
        INDEX idx_created_at (created_at),
        INDEX idx_quotation_date (quotation_date),
        INDEX idx_terms_id (terms_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create terms_conditions table
const createTermsConditionsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS terms_conditions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_id INT DEFAULT NULL,
        sales_invoice_id INT DEFAULT NULL,
        proforma_invoice_id INT DEFAULT NULL,
        party_id INT DEFAULT NULL,
        business_id INT NOT NULL,
        section_order INT NOT NULL DEFAULT 1,
        heading VARCHAR(255) NOT NULL DEFAULT 'Terms & Conditions',
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
        FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (proforma_invoice_id) REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        
        INDEX idx_quotation_id (quotation_id),
        INDEX idx_sales_id (sales_invoice_id),
        INDEX idx_proforma_id (proforma_invoice_id),
        INDEX idx_party_id (party_id),
        INDEX idx_business_id (business_id),
        INDEX idx_section_order (section_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Add terms_id column to quotations table if it doesn't exist
const addTermsIdToQuotations = async () => {
  try {
    // Check if terms_id column already exists
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'quotations' 
      AND COLUMN_NAME = 'terms_id'
    `);

    if (columns.length === 0) {
      // Column doesn't exist, add it
      await promisePool.query(`
        ALTER TABLE quotations 
        ADD COLUMN terms_id INT DEFAULT NULL AFTER bank_id
      `);

      // Add foreign key constraint
      try {
        await promisePool.query(`
          ALTER TABLE quotations 
          ADD CONSTRAINT fk_quotations_terms 
          FOREIGN KEY (terms_id) REFERENCES terms_conditions(id) 
          ON DELETE SET NULL
        `);
      } catch (fkError) {
        // Foreign key might already exist or terms_conditions table might not exist yet
      }

      // Add index
      try {
        await promisePool.query(`
          CREATE INDEX idx_terms_id ON quotations(terms_id)
        `);
      } catch (idxError) {
        // Index might already exist
      }
    }
  } catch (error) {

  }
};

// Add po_agreement_number and remark to quotations table if they don't exist
const addRemarkAndPoToQuotations = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotations'
    `);
    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('po_agreement_number')) {
      await promisePool.query('ALTER TABLE quotations ADD COLUMN po_agreement_number VARCHAR(100) AFTER notes');

    }
    if (!existingColumns.includes('remark')) {
      await promisePool.query('ALTER TABLE quotations ADD COLUMN remark TEXT AFTER po_agreement_number');

    }
  } catch (error) {

  }
};

// Add terms_id column to proforma_invoices table if it doesn't exist
const addTermsIdToProformaInvoices = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proforma_invoices' AND COLUMN_NAME = 'terms_id'
    `);
    if (columns.length === 0) {
      await promisePool.query(`ALTER TABLE proforma_invoices ADD COLUMN terms_id INT DEFAULT NULL AFTER bank_id`);
      try {
        await promisePool.query(`ALTER TABLE proforma_invoices ADD CONSTRAINT fk_proforma_terms FOREIGN KEY (terms_id) REFERENCES terms_conditions(id) ON DELETE SET NULL`);
      } catch (e) { }
    }
  } catch (error) {

  }
};

// Add terms_id column to sales_invoices table if it doesn't exist
const addTermsIdToSalesInvoices = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_invoices' AND COLUMN_NAME = 'terms_id'
    `);
    if (columns.length === 0) {
      await promisePool.query(`ALTER TABLE sales_invoices ADD COLUMN terms_id INT DEFAULT NULL AFTER bank_id`);
      try {
        await promisePool.query(`ALTER TABLE sales_invoices ADD CONSTRAINT fk_sales_terms FOREIGN KEY (terms_id) REFERENCES terms_conditions(id) ON DELETE SET NULL`);
      } catch (e) { }
    }
  } catch (error) {

  }
};

// Add missing columns to terms_conditions table if they don't exist
const addColumnsToTermsConditions = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terms_conditions'
    `);
    const existingColumns = columns.map(c => c.COLUMN_NAME);

    const columnsToAdd = [
      { name: 'sales_invoice_id', type: 'INT DEFAULT NULL' },
      { name: 'proforma_invoice_id', type: 'INT DEFAULT NULL' },
      { name: 'credit_note_id', type: 'INT DEFAULT NULL' },
      { name: 'debit_note_id', type: 'INT DEFAULT NULL' },
      { name: 'sales_return_id', type: 'INT DEFAULT NULL' },
      { name: 'purchase_return_id', type: 'INT DEFAULT NULL' },
      { name: 'delivery_challan_id', type: 'INT DEFAULT NULL' },
      { name: 'purchase_invoice_id', type: 'INT DEFAULT NULL' },
      { name: 'book_purchase_order_id', type: 'INT DEFAULT NULL' },
      { name: 'purchase_order_id', type: 'INT DEFAULT NULL' },
      { name: 'book_invoice_id', type: 'INT DEFAULT NULL' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // Add foreign key constraints if they don't exist
    try {
      if (!existingColumns.includes('sales_invoice_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_sales FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('proforma_invoice_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_proforma FOREIGN KEY (proforma_invoice_id) REFERENCES proforma_invoices(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('credit_note_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_credit_note FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('debit_note_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_debit_note FOREIGN KEY (debit_note_id) REFERENCES debit_notes(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('sales_return_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_sales_return FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('purchase_return_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_purchase_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('delivery_challan_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_delivery_challan FOREIGN KEY (delivery_challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('book_purchase_order_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_book_purchase_order FOREIGN KEY (book_purchase_order_id) REFERENCES book_purchase_orders(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('purchase_order_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE`);
      }
      if (!existingColumns.includes('book_invoice_id')) {
        await promisePool.query(`ALTER TABLE terms_conditions ADD CONSTRAINT fk_terms_book_invoice FOREIGN KEY (book_invoice_id) REFERENCES book_invoices(id) ON DELETE CASCADE`);
      }
    } catch (fkError) {

    }
  } catch (error) {

  }
};

// Add is_locked column to terms_conditions table if it doesn't exist
const addIsLockedToTermsConditions = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terms_conditions' AND COLUMN_NAME = 'is_locked'
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE terms_conditions ADD COLUMN is_locked BOOLEAN DEFAULT FALSE AFTER content
      `);
    }
  } catch (error) {

  }
};

// Add additional business details columns to businesses table if they don't exist
const addAdditionalBusinessDetailsColumns = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses'
    `);
    const existingColumns = columns.map(c => c.COLUMN_NAME);

    const columnsToAdd = [
      { name: 'msme_number', type: 'VARCHAR(50)' },
      { name: 'cin_number', type: 'VARCHAR(50)' },
      { name: 'tan_number', type: 'VARCHAR(50)' },
      { name: 'udyam_number', type: 'VARCHAR(50)' },
      { name: 'import_export_code', type: 'VARCHAR(50)' },
      { name: 'fssai_number', type: 'VARCHAR(50)' },
      { name: 'drug_license_number', type: 'VARCHAR(50)' },
      { name: 'website', type: 'VARCHAR(255)' },
      { name: 'comment', type: 'TEXT' },
      { name: 'stamp_url', type: 'VARCHAR(500)' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        await promisePool.query(`ALTER TABLE businesses ADD COLUMN ${column.name} ${column.type} DEFAULT NULL`);
      }
    }
  } catch (error) {

  }
};

// Add tax_type column to businesses table if it doesn't exist
const addTaxTypeToBusinesses = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses' AND COLUMN_NAME = 'tax_type'
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE businesses ADD COLUMN tax_type ENUM('GST', 'VAT', 'No') DEFAULT 'No' AFTER business_registration_type
      `);
    }
  } catch (error) {

  }
};

// Create credit notes table
const createCreditNotesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS credit_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        note_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        note_date DATE,
        updated_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        credit_note_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_note_number (business_id, note_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {

  }
};

// Create invoice sequences table (unified for all document types)
const createInvoiceSequencesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        invoice_type VARCHAR(50) NOT NULL,
        prefix VARCHAR(20),
        current_number INT DEFAULT 0,
        financial_year VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_sequence (business_id, invoice_type, financial_year),
        INDEX idx_business_type (business_id, invoice_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create sales returns table
const createSalesReturnsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sales_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        sales_return_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        return_date DATE,
        updated_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        sales_return_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_return_number (business_id, sales_return_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create debit notes table
const createDebitNotesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS debit_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        debit_note_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        note_date DATE,
        updated_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        debit_note_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_note_number (business_id, debit_note_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create purchase returns table
const createPurchaseReturnsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        purchase_return_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        return_date DATE,
        updated_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        purchase_return_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_return_number (business_id, purchase_return_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create delivery challans table
const createDeliveryChallanTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS delivery_challans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        challan_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        challan_date DATE,
        updated_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        challan_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_challan_number (business_id, challan_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create book purchase orders table
const createBookPurchaseOrderTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS book_purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        book_purchase_order_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255) NOT NULL,
        order_date DATE,
        updated_date DATE,
        due_date DATE,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        book_purchase_order_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_book_purchase_order_number (business_id, book_purchase_order_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create book invoices table
const createBookInvoiceTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS book_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        book_invoice_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        invoice_date DATE,
        updated_date DATE,
        due_date DATE,
        status ENUM('open', 'closed') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        book_invoice_data JSON,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_book_invoice_number (business_id, book_invoice_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create purchase orders table
const createPurchaseOrderTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        purchase_order_number VARCHAR(50) NOT NULL,
        party_id INT,
        party_name VARCHAR(255),
        order_date DATE,
        updated_date DATE,
        expected_delivery_date DATE,
        po_agreement_number VARCHAR(100),
        remark TEXT,
        status ENUM('open', 'closed', 'pending', 'rejected') DEFAULT 'open',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        grand_total DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        purchase_order_data JSON,
        level1_email VARCHAR(255),
        level2_email VARCHAR(255),
        level3_email VARCHAR(255),
        approved_by TEXT,
        action_by_name VARCHAR(255),
        action_by_email VARCHAR(255),
        action_at DATETIME,
        is_active TINYINT DEFAULT 1,
        bank_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL,
        UNIQUE KEY unique_order_number (business_id, purchase_order_number),
        INDEX idx_business_id (business_id),
        INDEX idx_party_id (party_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create contracts table (for PO Purchase Order)
const createContractsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        party_1_name VARCHAR(255),
        party_1_email VARCHAR(255),
        party_1_phone VARCHAR(50),
        party_1_address TEXT,
        party_2_name VARCHAR(255),
        party_2_email VARCHAR(255),
        party_2_phone VARCHAR(50),
        party_2_address TEXT,
        party_3_name VARCHAR(255),
        party_3_email VARCHAR(255),
        party_3_phone VARCHAR(50),
        party_3_address TEXT,
        contract_number VARCHAR(50),
        contract_date DATE,
        expiry_date DATE,
        status ENUM('active', 'inactive', 'draft', 'expired') DEFAULT 'draft',
        contract_content LONGTEXT,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};


// Create account_approvals table
const createAccountApprovalsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS account_approvals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        gst_number VARCHAR(20),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        rejection_reason TEXT,
        approved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_status (status),
        INDEX idx_user_id (user_id),
        INDEX idx_email (email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create audit_logs table
const createAuditLogsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        super_admin_id INT,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        status VARCHAR(50),
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (super_admin_id) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_super_admin_id (super_admin_id),
        INDEX idx_action (action),
        INDEX idx_target_type (target_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create pricing_plans table
const createPricingPlansTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS pricing_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        period VARCHAR(50) DEFAULT 'month',
        description TEXT,
        features JSON,
        is_active BOOLEAN DEFAULT true,
        display_order INT DEFAULT 0,
        featured_label VARCHAR(100),
        show_featured_label BOOLEAN DEFAULT false,
        max_subusers INT DEFAULT 0,
        max_businesses INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);

    // Insert default pricing plans if table is empty
    const [existingPlans] = await promisePool.query('SELECT COUNT(*) as count FROM pricing_plans');

    if (existingPlans[0].count === 0) {
      const defaultPlans = `
        INSERT INTO pricing_plans (name, price, period, description, features, display_order) VALUES
        (
          'Starter',
          0,
          'month',
          'Perfect for getting started',
          JSON_ARRAY('Up to 50 invoices/month', 'Basic GST reports', '1 user account', 'Email support'),
          1,
          1
        ),
        (
          'Professional',
          999,
          'month',
          'Most popular for growing businesses',
          JSON_ARRAY('Unlimited invoices', 'Advanced GST & e-invoicing', 'Up to 5 users', 'Priority support', 'Custom branding', 'Analytics dashboard'),
          2,
          5
        ),
        (
          'Enterprise',
          2999,
          'month',
          'For large organizations',
          JSON_ARRAY('Everything in Professional', 'Unlimited users', 'API access', 'Dedicated support', 'Custom integrations', 'Advanced security'),
          3,
          999
        );
      `;

      await promisePool.query(defaultPlans);
    }
  } catch (error) {
  }
};

// Add featured columns to pricing_plans if they don't exist
const addFeaturedColumnsToPricingPlans = async () => {
  try {
    // Check if featured_label column exists
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'featured_label'
    `);

    if (columns.length === 0) {
      // Add featured_label column
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN featured_label VARCHAR(100) DEFAULT NULL
      `);
    }

    // Check if show_featured_label column exists
    const [columns2] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'show_featured_label'
    `);

    if (columns2.length === 0) {
      // Add show_featured_label column
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN show_featured_label BOOLEAN DEFAULT false
      `);
    }
  } catch (error) {
  }
};

// Add original_price and offer_price columns to pricing_plans if they don't exist
const addPriceColumnsToPlans = async () => {
  try {
    // Check if original_price column exists
    const [columns1] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'original_price'
    `);

    if (columns1.length === 0) {
      // Add original_price column
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN original_price DECIMAL(10, 2) DEFAULT NULL
      `);
    }

    // Check if offer_price column exists
    const [columns2] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'offer_price'
    `);

    if (columns2.length === 0) {
      // Add offer_price column
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN offer_price DECIMAL(10, 2) DEFAULT NULL
      `);

      // Migrate existing price data to offer_price
      await promisePool.query(`
        UPDATE pricing_plans SET offer_price = price WHERE offer_price IS NULL
      `);
    }
  } catch (error) {
  }
};

// Drop unused columns from pricing_plans
const dropUnusedColumnsFromPlans = async () => {
  try {
    // Check if price column exists and drop it
    const [columns1] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'price'
    `);

    if (columns1.length > 0) {
      await promisePool.query(`
        ALTER TABLE pricing_plans DROP COLUMN price
      `);
    }
  } catch (error) {
  }
};

// Add show_featured_label column back if it doesn't exist
const addShowFeaturedLabelColumn = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'show_featured_label'
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN show_featured_label BOOLEAN DEFAULT false
      `);
    }
  } catch (error) {
  }
};

// Add max_subusers column to pricing_plans if it doesn't exist
const addMaxSubusersToPlans = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'max_subusers' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN max_subusers INT DEFAULT 0 AFTER show_featured_label
      `);
    }
  } catch (error) {
  }
};

// Add max_businesses column to pricing_plans if it doesn't exist
const addMaxBusinessesToPlans = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pricing_plans' AND COLUMN_NAME = 'max_businesses' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE pricing_plans ADD COLUMN max_businesses INT DEFAULT 1 AFTER max_subusers
      `);
      
      // Update default plans with some reasonable limits if they exist
      await promisePool.query("UPDATE pricing_plans SET max_businesses = 1 WHERE name = 'Starter'");
      await promisePool.query("UPDATE pricing_plans SET max_businesses = 5 WHERE name = 'Professional'");
      await promisePool.query("UPDATE pricing_plans SET max_businesses = 999 WHERE name = 'Enterprise'");
    }
  } catch (error) {
    // console.error('Error adding max_businesses to pricing_plans:', error.message);
  }
};

// Create project_expense table
const createProjectExpenseTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS project_expense (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        expense_number VARCHAR(50),
        account_name VARCHAR(255) NOT NULL,
        project_type ENUM('receivable', 'payable') DEFAULT 'receivable',
        party_name VARCHAR(255),
        party_email VARCHAR(255),
        party_phone VARCHAR(20),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        remarks TEXT,
        value_breakdown JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_expense_number (expense_number),
        INDEX idx_start_date (start_date),
        INDEX idx_project_type (project_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create project_parties table
const createProjectPartiesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS project_parties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_expense_id INT NOT NULL,
        party_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        business_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (project_expense_id) REFERENCES project_expense(id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_expense_id),
        INDEX idx_business_id (business_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};


// Drop project_expense table (for schema reset)
const dropProjectExpenseTable = async () => {
  try {
    await promisePool.query('DROP TABLE IF EXISTS project_expense_transactions');
    await promisePool.query('DROP TABLE IF EXISTS project_expense');
  } catch (error) {
  }
};

// Add missing columns to project_expense if they don't exist
const addColumnToProjectExpense = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'project_expense' AND TABLE_SCHEMA = DATABASE()
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    // expense_number
    if (!existingColumns.includes('expense_number')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN expense_number VARCHAR(50) AFTER business_id`);
      try {
        await promisePool.query(`CREATE INDEX idx_pe_expense_number ON project_expense(expense_number)`);
      } catch (idxErr) {}
    }

    // account_name
    if (!existingColumns.includes('account_name')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN account_name VARCHAR(255) NOT NULL AFTER business_id`);
    }

    // project_type
    if (!existingColumns.includes('project_type')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN project_type ENUM('receivable', 'payable') DEFAULT 'receivable' AFTER account_name`);
    }

    // party_name
    if (!existingColumns.includes('party_name')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN party_name VARCHAR(255) AFTER project_type`);
    }

    // party_email
    if (!existingColumns.includes('party_email')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN party_email VARCHAR(255) AFTER party_name`);
    }

    // party_phone
    if (!existingColumns.includes('party_phone')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN party_phone VARCHAR(20) AFTER party_email`);
    }

    // start_date (Migrate from transaction_date if it exists)
    if (!existingColumns.includes('start_date')) {
      if (existingColumns.includes('transaction_date')) {
        await promisePool.query(`ALTER TABLE project_expense CHANGE COLUMN transaction_date start_date DATE NOT NULL`);
      } else {
        // Anchor after party_phone if it existed at the start, otherwise anchor after project_type which is more likely to exist
        const anchor = existingColumns.includes('party_phone') ? 'party_phone' : 'project_type';
        await promisePool.query(`ALTER TABLE project_expense ADD COLUMN start_date DATE NOT NULL AFTER ${anchor}`);
      }
    }

    // end_date
    if (!existingColumns.includes('end_date')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN end_date DATE NOT NULL AFTER start_date`);
    }

    // amount
    if (!existingColumns.includes('amount')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN amount DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER end_date`);
    }

    // description / remarks
    if (!existingColumns.includes('remarks')) {
      if (existingColumns.includes('description')) {
        await promisePool.query(`ALTER TABLE project_expense CHANGE COLUMN description remarks TEXT`);
      } else {
        await promisePool.query(`ALTER TABLE project_expense ADD COLUMN remarks TEXT AFTER amount`);
      }
    }

    // value_breakdown
    if (!existingColumns.includes('value_breakdown')) {
      await promisePool.query(`ALTER TABLE project_expense ADD COLUMN value_breakdown JSON DEFAULT NULL AFTER remarks`);
    }
  } catch (error) {
  }
};

// Create project_expense_transactions table
const createProjectExpenseTransactionsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS project_expense_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_expense_id INT NOT NULL,
        business_id INT NOT NULL,
        transaction_type ENUM('debit', 'credit') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        transaction_date DATE NOT NULL,
        reference_type VARCHAR(50),
        reference_id INT,
        reference_number VARCHAR(100),
        party_name VARCHAR(255),
        party_id INT,
        party_email VARCHAR(255),
        party_phone VARCHAR(20),
        payment_method VARCHAR(50) DEFAULT 'cash',
        description TEXT,
        balance_after DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (project_expense_id) REFERENCES project_expense(id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_project_expense_id (project_expense_id),
        INDEX idx_business_id (business_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_transaction_type (transaction_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Add account_holder_name column to bank_details if it doesn't exist
const addAccountHolderNameToBankDetails = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'bank_details'
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('account_holder_name')) {
      await promisePool.query(`
        ALTER TABLE bank_details ADD COLUMN account_holder_name VARCHAR(255) DEFAULT NULL
      `);
    }

    if (!existingColumns.includes('party_id')) {
      await promisePool.query(`
        ALTER TABLE bank_details ADD COLUMN party_id INT DEFAULT NULL AFTER business_id
      `);

      try {
        await promisePool.query(`
          ALTER TABLE bank_details ADD CONSTRAINT fk_bank_details_party 
          FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
        `);
      } catch (fkError) {
        // FK might already exist or parties table not ready
      }
    }

    // Also ensure business_id can be NULL if it was previously NOT NULL
    try {
      await promisePool.query(`
        ALTER TABLE bank_details MODIFY COLUMN business_id INT DEFAULT NULL
      `);
    } catch (modifyError) {
      // Might fail if there are existing constraints that block it, but usually fine
    }

  } catch (error) {
  }
};

// Add qr_code column to bank_details if it doesn't exist
const addQrCodeColumnToBankDetails = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'bank_details' AND COLUMN_NAME = 'qr_code' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE bank_details ADD COLUMN qr_code VARCHAR(255) DEFAULT NULL
      `);
    }
  } catch (error) {
  }
};

// Add party_name and payment_method columns to project_expense_transactions if they don't exist
const addColumnsToProjectExpenseTransactions = async () => {
  try {
    const columnsToAdd = [
      { name: 'party_name', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'party_id', type: 'INT DEFAULT NULL' },
      { name: 'party_email', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'party_phone', type: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'payment_method', type: "VARCHAR(50) DEFAULT 'cash'" },
      { name: 'screenshot', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'category', type: 'VARCHAR(255) DEFAULT NULL' }
    ];

    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'project_expense_transactions' AND TABLE_SCHEMA = DATABASE()
    `);
    const existingColumns = columns.map(c => c.COLUMN_NAME);

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        await promisePool.query(`
          ALTER TABLE project_expense_transactions 
          ADD COLUMN ${column.name} ${column.type}
        `);
      }
    }
  } catch (error) {
  }
};

// Create einvoice_logs table
const createEInvoiceLogsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS einvoice_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        sales_invoice_id INT NOT NULL,
        irn VARCHAR(64),
        ack_no VARCHAR(50),
        ack_date DATETIME,
        signed_qr_code LONGTEXT,
        signed_invoice LONGTEXT,
        status ENUM('generated','cancelled','failed') DEFAULT 'generated',
        cancel_reason VARCHAR(255),
        irp_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_sales_invoice_id (sales_invoice_id),
        INDEX idx_irn (irn),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(query);
  } catch (error) {
  }
};
 
// Create purchase_requisitions table
const createPurchaseRequisitionsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        pr_number VARCHAR(50) NOT NULL,
        pr_date DATE NOT NULL,
        requester VARCHAR(255) NOT NULL,
        item_services TEXT,
        qty DECIMAL(15, 2) DEFAULT 0,
        uom VARCHAR(50),
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        items JSON,
        comments TEXT,
        attachment TEXT,
        status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
        po_number VARCHAR(100),
        approvers TEXT,
        action_by_name VARCHAR(255),
        action_by_email VARCHAR(255),
        action_at DATETIME,
        approved_by TEXT,
        level1_email VARCHAR(255),
        level2_email VARCHAR(255),
        level3_email VARCHAR(255),
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_pr_number (business_id, pr_number),
        INDEX idx_business_id (business_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
    console.error('Error creating purchase_requisitions table:', error.message);
  }
};

// Add currency column to purchase_requisitions table
const addCurrencyToPurchaseRequisitions = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'purchase_requisitions' AND COLUMN_NAME = 'currency' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE purchase_requisitions ADD COLUMN currency VARCHAR(10) DEFAULT 'INR' AFTER total_amount
      `);
    }
  } catch (error) {
    console.error('Error adding currency to purchase_requisitions:', error.message);
  }
};

// Add IRN and einvoice_status columns to sales_invoices
const addEInvoiceColumnsToSalesInvoices = async () => {
  try {
    const [irnCol] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'sales_invoices' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'irn'
    `);
    if (irnCol.length === 0) {
      await promisePool.query(`ALTER TABLE sales_invoices ADD COLUMN irn VARCHAR(64) DEFAULT NULL`);
    }

    const [statusCol] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'sales_invoices' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'einvoice_status'
    `);
    if (statusCol.length === 0) {
      await promisePool.query(`
        ALTER TABLE sales_invoices
        ADD COLUMN einvoice_status ENUM('not_applicable','pending','generated','cancelled') DEFAULT 'not_applicable'
      `);
    }
  } catch (error) {
  }
};

// Add po_reference column to book_invoices if it doesn't exist
const addPoReferenceToBookInvoices = async () => {
  try {
    const [cols] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_invoices' AND COLUMN_NAME = 'po_reference'
    `);
    if (cols.length === 0) {
      await promisePool.query(`ALTER TABLE book_invoices ADD COLUMN po_reference VARCHAR(100) DEFAULT NULL AFTER notes`);
      await promisePool.query(`CREATE INDEX idx_bi_po_reference ON book_invoices(po_reference)`);
    }
  } catch (error) {
  }
};


// Create Z Khata Book tables
const createZKhataPartiesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS z_khata_parties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        entry_number VARCHAR(50),
        financial_year VARCHAR(20),
        party_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        party_type VARCHAR(50) NOT NULL,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        balance_type ENUM('Money Out', 'Money In') NOT NULL,
        gstin VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_party_type (party_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

const addColumnsToZKhataParties = async () => {
  try {
    const [cols] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'z_khata_parties' AND COLUMN_NAME IN ('entry_number', 'financial_year')
      AND TABLE_SCHEMA = DATABASE()
    `);
    if (cols.length < 2) {
      const existingCols = cols.map(c => c.COLUMN_NAME);
      if (!existingCols.includes('entry_number')) {
        await promisePool.query(`ALTER TABLE z_khata_parties ADD COLUMN entry_number VARCHAR(50) AFTER business_id`);
      }
      if (!existingCols.includes('financial_year')) {
        await promisePool.query(`ALTER TABLE z_khata_parties ADD COLUMN financial_year VARCHAR(20) AFTER entry_number`);
      }
    }
  } catch (error) {
  }
};

const createZKhataTransactionsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS z_khata_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        party_id INT NOT NULL,
        business_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        type ENUM('payment_in', 'payment_out') NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES z_khata_parties(id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_party_id (party_id),
        INDEX idx_business_id (business_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Drop redundant book_invoice_supplier_invoices table as all data is now in JSON
const dropRedundantBookInvoiceTables = async () => {
  try {
    await promisePool.query('DROP TABLE IF EXISTS book_invoice_supplier_invoices');
  } catch (error) {
  }
};

// Create demo_availability_overrides table
const createDemoAvailabilityOverridesTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS demo_availability_overrides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        override_date DATE NOT NULL,
        slot_time VARCHAR(10) NOT NULL, -- e.g., '09:00' or 'FULL_DAY'
        is_available BOOLEAN NOT NULL DEFAULT FALSE,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date_slot (override_date, slot_time),
        INDEX idx_date (override_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Create items_category table
const createItemsCategoryTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS items_category (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_business_category (business_id, name),
        INDEX idx_business_id (business_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);
  } catch (error) {
  }
};

// Migrate existing party categories
const migratePartyCategories = async () => {
  try {
    // 1. Add category_id column if it doesn't exist
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'parties' AND COLUMN_NAME = 'category_id' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query('ALTER TABLE parties ADD COLUMN category_id INT DEFAULT NULL AFTER category');
      await promisePool.query('ALTER TABLE parties ADD CONSTRAINT fk_parties_category FOREIGN KEY (category_id) REFERENCES items_category(id) ON DELETE SET NULL');
    }

    // 2. Extract unique categories from parties table and insert into items_category
    const [existingCategories] = await promisePool.query(`
      SELECT DISTINCT business_id, category 
      FROM parties 
      WHERE category IS NOT NULL AND category != ''
    `);

    for (const row of existingCategories) {
      // Insert category if it doesn't exist
      await promisePool.query(`
        INSERT IGNORE INTO items_category (business_id, name) 
        VALUES (?, ?)
      `, [row.business_id, row.category]);

      // Get the category ID
      const [catRow] = await promisePool.query(`
        SELECT id FROM items_category 
        WHERE business_id = ? AND name = ?
      `, [row.business_id, row.category]);

      if (catRow.length > 0) {
        const categoryId = catRow[0].id;
        // Update parties with the new category_id
        await promisePool.query(`
          UPDATE parties 
          SET category_id = ? 
          WHERE business_id = ? AND category = ?
        `, [categoryId, row.business_id, row.category]);
      }
    }

  } catch (error) {
  }
};

// Add no_tax column to parties table
const addNoTaxColumnToParties = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'parties' AND COLUMN_NAME = 'no_tax' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query('ALTER TABLE parties ADD COLUMN no_tax BOOLEAN DEFAULT FALSE AFTER vat');
    }
  } catch (error) {
  }
}; 

// Create GRN records table
const createGrnRecordsTable = async () => {
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS grn_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        party_id INT DEFAULT NULL,
        bill_to_address_id INT DEFAULT NULL,
        products JSON DEFAULT NULL,
        terms JSON DEFAULT NULL,
        totals JSON DEFAULT NULL,
        grn_date DATE DEFAULT NULL,
        due_date DATE DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        grn_number VARCHAR(100) NOT NULL,
        purchase_order_number VARCHAR(100) DEFAULT NULL,
        delivery_location VARCHAR(255) DEFAULT NULL,
        cost_center VARCHAR(255) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_grn_business (business_id),
        INDEX idx_grn_party (party_id),
        INDEX idx_grn_number (grn_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    console.error('Error creating grn_records table:', error.message);
  }
};

// Create MRN records table
const createMrnRecordsTable = async () => {
  try {
    // no Table right now
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS mrn_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        party_id INT DEFAULT NULL,
        bill_to_address_id INT DEFAULT NULL,
        products JSON DEFAULT NULL,
        terms JSON DEFAULT NULL,
        totals JSON DEFAULT NULL,
        mrn_date DATE DEFAULT NULL,
        due_date DATE DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        mrn_number VARCHAR(100) NOT NULL,
        purchase_order_number VARCHAR(100) DEFAULT NULL,
        delivery_location VARCHAR(255) DEFAULT NULL,
        cost_center VARCHAR(255) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mrn_business (business_id),
        INDEX idx_mrn_party (party_id),
        INDEX idx_mrn_number (mrn_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    console.error('Error creating mrn_records table:', error.message);
  }
};

// Create sales_leads table
const createSalesLeadsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sales_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        lead_no VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        value DECIMAL(15, 2) DEFAULT 0,
        uoms JSON,
        email VARCHAR(255),
        phone VARCHAR(50),
        source VARCHAR(100),
        probability INT DEFAULT 0,
        priority VARCHAR(50) DEFAULT 'Medium',
        date_added DATE,
        assigned_to VARCHAR(255),
        status ENUM('open', 'converted', 'closed') DEFAULT 'open',
        closed_by VARCHAR(255),
        close_comment TEXT,
        activity_log JSON,
        files JSON,
        created_by INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_lead_no (business_id, lead_no),
        INDEX idx_business_id (business_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
    console.error('Error creating sales_leads table:', error);
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) return;

    // Increase max_allowed_packet to handle large JSON blobs (e.g. base64 attachments)
    try {
      await promisePool.query('SET GLOBAL max_allowed_packet = 16777216');
    } catch (e) {

    }// Migrate existing inventory categories
    const migrateInventoryCategories = async () => {
      try {
        // 1. Add category_id column if it doesn't exist
        const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory' AND COLUMN_NAME = 'category_id' AND TABLE_SCHEMA = DATABASE()
    `);

        if (columns.length === 0) {
          await promisePool.query('ALTER TABLE inventory ADD COLUMN category_id INT DEFAULT NULL AFTER category');
          await promisePool.query('ALTER TABLE inventory ADD CONSTRAINT fk_inventory_category FOREIGN KEY (category_id) REFERENCES items_category(id) ON DELETE SET NULL');
        }

        // 2. Extract unique categories from inventory table and insert into items_category
        const [existingCategories] = await promisePool.query(`
      SELECT DISTINCT business_id, category 
      FROM inventory 
      WHERE category IS NOT NULL AND category != ''
    `);

        for (const cat of existingCategories) {
          // Insert into items_category if not exists
          await promisePool.query('INSERT IGNORE INTO items_category (business_id, name) VALUES (?, ?)', [cat.business_id, cat.category]);

          // Get the id
          const [rows] = await promisePool.query('SELECT id FROM items_category WHERE business_id = ? AND name = ?', [cat.business_id, cat.category]);

          if (rows.length > 0) {
            const categoryId = rows[0].id;
            // Update inventory items with this name and business_id
            await promisePool.query('UPDATE inventory SET category_id = ? WHERE business_id = ? AND category = ?', [categoryId, cat.business_id, cat.category]);
          }
        }
      } catch (error) {
      }
    };

    const addRemarkToAllTables = async () => {
      try {
        const tables = [
          'sales_returns',
          'debit_notes',
          'purchase_returns',
          'delivery_challans',
          'book_invoices',
          'purchase_orders'
        ];

        for (const table of tables) {
          const [columns] = await promisePool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'remark'
      `, [table]);

          if (columns.length === 0) {
            // Find 'notes' column to add 'remark' after it
            const [notesCol] = await promisePool.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'notes'
        `, [table]);

            if (notesCol.length > 0) {
              await promisePool.query(`ALTER TABLE ${table} ADD COLUMN remark TEXT AFTER notes`);
            } else {
              await promisePool.query(`ALTER TABLE ${table} ADD COLUMN remark TEXT`);
            }
          }
        }
      } catch (error) {
      }
    };

    // Add logo column to custom_quotations table
    // Add logo column to custom_quotations table
    const addLogoToCustomQuotations = async () => {
      try {
        const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'custom_quotations' AND COLUMN_NAME = 'logo' AND TABLE_SCHEMA = DATABASE()
    `);

        if (columns.length === 0) {
          await promisePool.query('ALTER TABLE custom_quotations ADD COLUMN logo LONGTEXT DEFAULT NULL AFTER company_email');
        }
      } catch (error) {
        console.error('Error adding logo column to custom_quotations:', error);
      }
    };

    // Add business_name column to custom_quotations
    const addBusinessNameToCustomQuotationsHelper = async () => {
      try {
        const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'custom_quotations' AND COLUMN_NAME = 'business_name' AND TABLE_SCHEMA = DATABASE()
    `);

        if (columns.length === 0) {
          await promisePool.query('ALTER TABLE custom_quotations ADD COLUMN business_name VARCHAR(255) DEFAULT NULL AFTER logo');
        }
      } catch (error) {
        console.error('Error adding business_name column to custom_quotations:', error);
      }
    };

    // Add remark column to custom_quotations
    const addRemarkToCustomQuotationsHelper = async () => {
      try {
        const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'custom_quotations' AND COLUMN_NAME = 'remark' AND TABLE_SCHEMA = DATABASE()
    `);

        if (columns.length === 0) {
          await promisePool.query('ALTER TABLE custom_quotations ADD COLUMN remark TEXT DEFAULT NULL AFTER business_name');
        }
      } catch (error) {
        console.error('Error adding remark column to custom_quotations:', error);
      }
    };

    // Create custom quotations table
    const createCustomQuotationTable = async () => {
      try {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS custom_quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        header_text VARCHAR(255) DEFAULT NULL,
        quotation_date DATE DEFAULT NULL,
        company_name VARCHAR(255) DEFAULT NULL,
        company_address TEXT DEFAULT NULL,
        company_phone VARCHAR(50) DEFAULT NULL,
        company_email VARCHAR(255) DEFAULT NULL,
        logo LONGTEXT DEFAULT NULL,
        business_name VARCHAR(255) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        total_amount DECIMAL(15, 2) DEFAULT 0.00,
        sections LONGTEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        await promisePool.query(createTableQuery);
      } catch (error) {
        console.error('Error creating custom_quotations table:', error);
      }
    };

    const updatePurchaseOrdersTable = async () => {
      try {
        const [columns] = await promisePool.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'purchase_orders' AND TABLE_SCHEMA = DATABASE()
        `);
        if (columns.length === 0) return;
        
        const existingColumns = columns.map(c => c.COLUMN_NAME);
        const statusCol = columns.find(c => c.COLUMN_NAME === 'status');

        // 1. Update status ENUM if needed
        if (statusCol && !statusCol.COLUMN_TYPE.includes('pending')) {
           await promisePool.query(`
             ALTER TABLE purchase_orders 
             MODIFY COLUMN status ENUM('open', 'closed', 'pending', 'rejected') DEFAULT 'open'
           `);
        }

        // 2. Add missing columns
        const columnsToAdd = [
          { name: 'po_agreement_number', type: 'VARCHAR(100) DEFAULT NULL' },
          { name: 'remark', type: 'TEXT DEFAULT NULL' },
          { name: 'level1_email', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'level2_email', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'level3_email', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'approved_by', type: 'TEXT DEFAULT NULL' },
          { name: 'action_by_name', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'action_by_email', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'action_at', type: 'DATETIME DEFAULT NULL' }
        ];

        for (const col of columnsToAdd) {
          if (!existingColumns.includes(col.name)) {
            await promisePool.query(`ALTER TABLE purchase_orders ADD COLUMN ${col.name} ${col.type}`);
          }
        }
      } catch (error) {
        console.error('Error updating purchase_orders table:', error);
      }
    };

    await createUsersTable();
    await createSubUsersTable();
    await createOTPsTable();
    await createBillingTable();
    await createBusinessesTable();
    await createSubUserBusinessAccessTable();
    await createQuotationsTable();
    await createProformaInvoicesTable();
    await createSalesInvoicesTable();
    await createTermsConditionsTable();
    await createCreditNotesTable();
    await createInvoiceSequencesTable();
    await createSalesReturnsTable();
    await createDebitNotesTable();
    await createPurchaseReturnsTable();
    await createDeliveryChallanTable();
    await createBookPurchaseOrderTable();
    await createBookInvoiceTable();
    await createPurchaseOrderTable();
    await updatePurchaseOrdersTable();
    await createContractsTable();
    await createAccountApprovalsTable();
    await createAuditLogsTable();
    await createPricingPlansTable();
    await createProjectExpenseTable();
    await createProjectExpenseTransactionsTable();
    await createProjectPartiesTable();
    await createZKhataPartiesTable();
    await addColumnsToZKhataParties();
    await createZKhataTransactionsTable();
    await createDemoAvailabilityOverridesTable();
    await createItemsCategoryTable();
    await migratePartyCategories();
    await addNoTaxColumnToParties();
    await migrateInventoryCategories();
    await addTermsIdToQuotations();
    await addRemarkAndPoToQuotations();
    await addTermsIdToProformaInvoices();
    await addTermsIdToSalesInvoices();
    await addColumnsToTermsConditions();
    await addAdditionalBusinessDetailsColumns();
    await addIsLockedToTermsConditions();
    await addAccountHolderNameToBankDetails();
    await addColumnsToProjectExpenseTransactions();
    await addEInvoiceColumnsToSalesInvoices();
    await addQrCodeColumnToBankDetails();
    await createEInvoiceLogsTable();
    // PO Book Invoice — Supplier Receipt Entry
    await addPoReferenceToBookInvoices();
    await addColumnToProjectExpense();
    await addRemarkToAllTables();
    await dropRedundantBookInvoiceTables();
    await createCustomQuotationTable();
    await addLogoToCustomQuotations();
    await addBusinessNameToCustomQuotationsHelper();
    await addRemarkToCustomQuotationsHelper();
    await addParty3ColumnsToContracts();
    await addLastLoginToSubUsers();
    await addMaxSubusersToPlans();
    await addPermissionsToSubUsers();
    await createMrnRecordsTable(); 
    await createSalesLeadsTable();
    await createPurchaseRequisitionsTable();
    await addCurrencyToPurchaseRequisitions();
    await addMaxBusinessesToPlans();
    await addTaxTypeToBusinesses();

  } catch (error) {
  }
};

const addParty3ColumnsToContracts = async () => {
  try {
    const columns = [
      { name: 'party_3_name', type: 'VARCHAR(255)' },
      { name: 'party_3_email', type: 'VARCHAR(255)' },
      { name: 'party_3_phone', type: 'VARCHAR(40)' },
      { name: 'party_3_address', type: 'TEXT' }
    ];

    for (const col of columns) {
      const [rows] = await promisePool.query(
        `SHOW COLUMNS FROM contracts LIKE ?`, [col.name]
      );
      if (rows.length === 0) {
        await promisePool.query(
          `ALTER TABLE contracts ADD COLUMN ${col.name} ${col.type}`
        );
      }
    }
  } catch (error) {
  }
};

// Create sub_users table
const createSubUsersTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sub_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP NULL,
        permissions JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_parent_user_id (parent_user_id),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
    console.error('Error creating sub_users table:', error);
  }
};

// Create sub_user_business_access table
const createSubUserBusinessAccessTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sub_user_business_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sub_user_id INT NOT NULL,
        business_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sub_user_id) REFERENCES sub_users(id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_sub_user_business (sub_user_id, business_id),
        INDEX idx_sub_user_id (sub_user_id),
        INDEX idx_business_id (business_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await promisePool.query(createTableQuery);
  } catch (error) {
    console.error('Error creating sub_user_business_access table:', error);
  }
};
// Add last_login_at column to sub_users if it doesn't exist
const addLastLoginToSubUsers = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sub_users' AND COLUMN_NAME = 'last_login_at' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE sub_users ADD COLUMN last_login_at TIMESTAMP NULL AFTER is_active
      `);
    }
  } catch (error) {
    console.error('Error adding last_login_at to sub_users:', error);
  }
};

// Add permissions column to sub_users if it doesn't exist
const addPermissionsToSubUsers = async () => {
  try {
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sub_users' AND COLUMN_NAME = 'permissions' AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await promisePool.query(`
        ALTER TABLE sub_users ADD COLUMN permissions JSON DEFAULT NULL AFTER last_login_at
      `);
    }
  } catch (error) {
    console.error('Error adding permissions to sub_users:', error);
  }
};

// Create otps table for email verification and login
const createOTPsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) DEFAULT 'login',
        is_used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email, otp),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await promisePool.query(createTableQuery);

  } catch (error) {

  }
};

module.exports = {
  pool: promisePool,
  testConnection,
  initializeDatabase
};
