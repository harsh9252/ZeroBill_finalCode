const { pool } = require('../config/database');

class ProjectExpenseTransaction {
  static async create(transactionData) {
    const {
      businessId,
      projectExpenseId,
      amount,
      transactionType, // 'debit' or 'credit'
      transactionDate,
      description,
      paymentMethod,
      screenshot,
      project_party_id,
      category
    } = transactionData;

    const query = `
      INSERT INTO project_expense_transactions (
        business_id, project_expense_id, amount, transaction_type, transaction_date, 
        description, payment_method, screenshot, project_party_id, party_name, party_phone, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      businessId,
      projectExpenseId,
      amount,
      transactionType,
      transactionDate,
      description || null,
      paymentMethod || 'cash',
      screenshot || null,
      project_party_id || null,
      transactionData.party_name || null,
      transactionData.party_phone || null,
      category || null
    ]);

    return this.findById(result.insertId);
  }

  // Find transaction by ID
  static async findById(id) {
    const query = `
      SELECT t.*, COALESCE(t.party_name, p.party_name) as party_name, COALESCE(t.party_phone, p.phone) as party_phone
      FROM project_expense_transactions t
      LEFT JOIN project_parties p ON t.project_party_id = p.id
      WHERE t.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find all transactions for a project expense
  static async findByProjectExpenseId(projectExpenseId) {
   
    const query = `
      SELECT t.*, COALESCE(t.party_name, p.party_name) as party_name, COALESCE(t.party_phone, p.phone) as party_phone
      FROM project_expense_transactions t
      LEFT JOIN project_parties p ON t.project_party_id = p.id
      WHERE t.project_expense_id = ?
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `;
   
    const [rows] = await pool.execute(query, [projectExpenseId]);
    return rows;
  }

  // Find all transactions for a business
  static async findByBusinessId(businessId) {
    const query = `
      SELECT t.*, COALESCE(t.party_name, p.party_name) as party_name, COALESCE(t.party_phone, p.phone) as party_phone
      FROM project_expense_transactions t
      LEFT JOIN project_parties p ON t.project_party_id = p.id
      WHERE t.business_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  }

  // Update transaction
  static async update(id, businessId, transactionData) {
    const {
      amount,
      transactionType,
      transactionDate,
      description,
      paymentMethod,
      screenshot,
      project_party_id,
      category
    } = transactionData;

    let query = `
      UPDATE project_expense_transactions SET
        amount = ?,
        transaction_type = ?,
        transaction_date = ?,
        description = ?,
        payment_method = ?,
        category = ?
    `;

    const values = [
      amount,
      transactionType,
      transactionDate,
      description || null,
      paymentMethod || 'cash',
      category || null
    ];

    // Only add screenshot if it was explicitly provided
    if (screenshot !== undefined) {
      query += `, screenshot = ?`;
      values.push(screenshot || null);
    }

    query += `, project_party_id = ?, party_name = ?, party_phone = ? WHERE id = ? AND business_id = ?`;
    values.push(
      project_party_id || null,
      transactionData.party_name || null,
      transactionData.party_phone || null,
      id,
      businessId
    );

    await pool.execute(query, values);

    return this.findById(id);
  }


  // Delete transaction
  static async delete(id, businessId) {
    const query = 'DELETE FROM project_expense_transactions WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  }

  // Get summary for a project expense
  static async getSummary(projectExpenseId) {
    const query = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_payment
      FROM project_expense_transactions 
      WHERE project_expense_id = ?
    `;
    const [rows] = await pool.execute(query, [projectExpenseId]);
    return rows[0];
  }
}

module.exports = ProjectExpenseTransaction;

