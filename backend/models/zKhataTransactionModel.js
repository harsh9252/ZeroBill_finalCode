const { pool } = require('../config/database');

class ZKhataTransaction {
    static async create(transactionData) {
        const {
            partyId,
            businessId,
            amount,
            type,
            date,
            description,
            imageUrl
        } = transactionData;

        const query = `
      INSERT INTO z_khata_transactions (
        party_id, business_id, amount, type, date, description, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [
            partyId,
            businessId,
            amount,
            type,
            date,
            description || null,
            imageUrl || null
        ]);

        return this.findById(result.insertId);
    }

    static async findById(id) {
        const query = 'SELECT * FROM z_khata_transactions WHERE id = ?';
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async findByPartyId(partyId, businessId) {
        const query = `
      SELECT * FROM z_khata_transactions 
      WHERE party_id = ? AND business_id = ?
      ORDER BY date DESC, created_at DESC
    `;
        const [rows] = await pool.execute(query, [partyId, businessId]);
        return rows;
    }

    static async delete(id, businessId) {
        const query = 'DELETE FROM z_khata_transactions WHERE id = ? AND business_id = ?';
        const [result] = await pool.execute(query, [id, businessId]);
        return result.affectedRows > 0;
    }

    static async update(id, businessId, transactionData) {
        const {
            amount,
            type,
            date,
            description,
            imageUrl
        } = transactionData;

        const query = `
      UPDATE z_khata_transactions SET
        amount = ?,
        type = ?,
        date = ?,
        description = ?,
        image_url = ?
      WHERE id = ? AND business_id = ?
    `;

        await pool.execute(query, [
            amount,
            type,
            date,
            description || null,
            imageUrl || null,
            id,
            businessId
        ]);

        return this.findById(id);
    }
}

module.exports = ZKhataTransaction;
