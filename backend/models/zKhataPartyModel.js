const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

class ZKhataParty {
    static async create(partyData) {
        const {
            businessId,
            partyName,
            phoneNumber,
            partyType,
            openingBalance,
            balanceType,
            gstin,
            address
        } = partyData;

        // If user provided an entry number, check if it already exists
        if (partyData.entry_number) {
            const exists = await checkDocumentNumberExists(businessId, 'z_khata_party', partyData.entry_number);
            if (exists) {
                const error = new Error(`Entry number ${partyData.entry_number} already exists in this business`);
                error.code = 'DUPLICATE_NUMBER';
                throw error;
            }
        }

        // Generate entry number
        const entryNumber = partyData.entry_number || await generateInvoiceNumber(businessId, 'z_khata_party');
        const year = new Date().getFullYear();
        const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;

        const query = `
      INSERT INTO z_khata_parties (
        business_id, entry_number, financial_year, party_name, phone_number, party_type, 
        opening_balance, balance_type, gstin, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [
            businessId,
            entryNumber,
            financialYear,
            partyName,
            phoneNumber || null,
            partyType,
            openingBalance || 0,
            balanceType,
            gstin || null,
            address || null
        ]);

        return this.findById(result.insertId);
    }

    static async findById(id) {
        const query = 'SELECT * FROM z_khata_parties WHERE id = ?';
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async findByBusinessId(businessId, type = 'all') {
        let query = `
      SELECT p.*, 
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN t.amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) as total_out
      FROM z_khata_parties p
      LEFT JOIN z_khata_transactions t ON p.id = t.party_id
      WHERE p.business_id = ?
    `;

        const params = [businessId];

        if (type !== 'all') {
            if (type === 'other') {
                query += " AND p.party_type NOT IN ('customer', 'supplier')";
            } else {
                query += ' AND p.party_type = ?';
                params.push(type);
            }
        }

        query += ' GROUP BY p.id ORDER BY p.created_at DESC';

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async update(id, businessId, partyData) {
        const {
            partyName,
            phoneNumber,
            partyType,
            openingBalance,
            balanceType,
            gstin,
            address
        } = partyData;

        const query = `
      UPDATE z_khata_parties SET
        party_name = ?,
        phone_number = ?,
        party_type = ?,
        opening_balance = ?,
        balance_type = ?,
        gstin = ?,
        address = ?
      WHERE id = ? AND business_id = ?
    `;

        await pool.execute(query, [
            partyName,
            phoneNumber || null,
            partyType,
            openingBalance || 0,
            balanceType,
            gstin || null,
            address || null,
            id,
            businessId
        ]);

        return this.findById(id);
    }

    static async delete(id, businessId) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // Delete related transactions first
            await connection.execute('DELETE FROM z_khata_transactions WHERE party_id = ?', [id]);
            // Delete the party
            const [result] = await connection.execute('DELETE FROM z_khata_parties WHERE id = ? AND business_id = ?', [id, businessId]);
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ZKhataParty;
