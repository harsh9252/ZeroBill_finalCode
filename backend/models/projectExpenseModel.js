const { pool } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');

class ProjectExpense {
  static async create(expenseData) {
    const {
      businessId,
      accountName,
      location,
      startDate,
      endDate,
      amount,
      remarks,
      category
    } = expenseData;

    // Generate project expense number if not passed
    const expenseNumber = expenseData.expenseNumber || await generateInvoiceNumber(businessId, 'project_expense');

    const query = `
      INSERT INTO project_expense (
        business_id, expense_number, account_name, project_type, location,
        start_date, end_date, amount, remarks, value_breakdown,
        category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      businessId,
      expenseNumber,
      accountName,
      expenseData.projectType || 'payable',
      location || null,
      startDate,
      endDate,
      amount || 0,
      remarks || null,
      expenseData.valueBreakdown ? JSON.stringify(expenseData.valueBreakdown) : null,
      category || null
    ]);

    return this.findById(result.insertId);
  }

  // Find record by ID
  static async findById(id) {
    const query = 'SELECT * FROM project_expense WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find all records for a business
  static async findByBusinessId(businessId) {
    const query = `
      SELECT * FROM project_expense 
      WHERE business_id = ? 
      ORDER BY start_date DESC, created_at DESC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  }

  // Update record
  static async update(id, businessId, expenseData) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const {
      accountName,
      location,
      startDate,
      endDate,
      amount,
      remarks
    } = expenseData;

    const expenseNumber = expenseData.expenseNumber !== undefined ? expenseData.expenseNumber : existing.expense_number;

    const query = `
      UPDATE project_expense SET
        expense_number = ?,
        account_name = ?,
        project_type = ?,
        location = ?,
        start_date = ?,
        end_date = ?,
        amount = ?,
        remarks = ?,
        value_breakdown = ?,
        category = ?
      WHERE id = ? AND business_id = ?
    `;

    await pool.execute(query, [
      expenseNumber,
      expenseData.accountName,
      expenseData.projectType || 'payable',
      expenseData.location || null,
      expenseData.startDate || null,
      expenseData.endDate || null,
      expenseData.amount || 0,
      expenseData.remarks || null,
      expenseData.valueBreakdown ? JSON.stringify(expenseData.valueBreakdown) : null,
      expenseData.category || null,
      id,
      businessId
    ]);

    return this.findById(id);
  }

  // Delete record (performing hard delete)
  static async delete(id, businessId) {
    const query = 'DELETE FROM project_expense WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  }
}

module.exports = ProjectExpense;
