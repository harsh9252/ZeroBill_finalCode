const { pool } = require('../config/database');

class ProjectParty {
  static async create(partyData) {
    const {
      projectExpenseId,
      partyName,
      phone,
      email,
      businessId
    } = partyData;

    const query = `
      INSERT INTO project_parties (
        project_expense_id, party_name, phone, email, business_id
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      projectExpenseId,
      partyName,
      phone || null,
      email || null,
      businessId
    ]);

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const query = 'SELECT * FROM project_parties WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByProjectExpenseId(projectExpenseId) {
    const query = `
      SELECT * FROM project_parties 
      WHERE project_expense_id = ? 
      ORDER BY party_name ASC
    `;
    const [rows] = await pool.execute(query, [projectExpenseId]);
    return rows;
  }

  static async update(id, partyData) {
    const {
      partyName,
      phone,
      email
    } = partyData;

    const query = `
      UPDATE project_parties SET
        party_name = ?,
        phone = ?,
        email = ?
      WHERE id = ?
    `;

    await pool.execute(query, [
      partyName,
      phone || null,
      email || null,
      id
    ]);

    return this.findById(id);
  }

  static async delete(id) {
    const query = 'DELETE FROM project_parties WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = ProjectParty;
