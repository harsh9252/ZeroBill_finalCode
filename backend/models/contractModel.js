const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const Contract = {
    create: async (contractData) => {
        // If user provided a contract number, check if it already exists
        if (contractData.contract_number) {
            const exists = await checkDocumentNumberExists(contractData.business_id, 'contract', contractData.contract_number);
            if (exists) {
                const error = new Error(`Contract number ${contractData.contract_number} already exists in this business`);
                error.code = 'DUPLICATE_NUMBER';
                throw error;
            }
        }

        const contractNumber = contractData.contract_number || await generateInvoiceNumber(contractData.business_id, 'contract');

        const {
            business_id,
            party_1_name,
            party_1_email,
            party_1_phone,
            party_1_address,
            party_2_name,
            party_2_email,
            party_2_phone,
            party_2_address,
            party_3_name,
            party_3_email,
            party_3_phone,
            party_3_address,
            contract_date,
            expiry_date,
            status,
            contract_content,
            created_by
        } = contractData;

        const query = `
      INSERT INTO contracts (
        business_id, party_1_name, party_1_email, party_1_phone, party_1_address,
        party_2_name, party_2_email, party_2_phone, party_2_address,
        party_3_name, party_3_email, party_3_phone, party_3_address,
        contract_number, contract_date, expiry_date, status, contract_content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.query(query, [
            business_id,
            party_1_name || null,
            party_1_email || null,
            party_1_phone || null,
            party_1_address || null,
            party_2_name || null,
            party_2_email || null,
            party_2_phone || null,
            party_2_address || null,
            party_3_name || null,
            party_3_email || null,
            party_3_phone || null,
            party_3_address || null,
            contractNumber,
            contract_date || null,
            expiry_date || null,
            status || 'draft',
            contract_content || ''
        ]);

        return { id: result.insertId, ...contractData };
    },

    getAllByBusiness: async (business_id) => {
        const query = 'SELECT * FROM contracts WHERE business_id = ? ORDER BY created_at DESC';
        const [rows] = await pool.query(query, [business_id]);
        return rows;
    },

    getById: async (id, business_id) => {
        const query = 'SELECT * FROM contracts WHERE id = ? AND business_id = ?';
        const [rows] = await pool.query(query, [id, business_id]);
        return rows[0];
    },

    update: async (id, business_id, contractData) => {
        const {
            party_1_name,
            party_1_email,
            party_1_phone,
            party_1_address,
            party_2_name,
            party_2_email,
            party_2_phone,
            party_2_address,
            party_3_name,
            party_3_email,
            party_3_phone,
            party_3_address,
            contract_number,
            contract_date,
            expiry_date,
            status,
            contract_content
        } = contractData;

        const query = `
      UPDATE contracts SET 
        party_1_name = ?, 
        party_1_email = ?, 
        party_1_phone = ?, 
        party_1_address = ?, 
        party_2_name = ?, 
        party_2_email = ?, 
        party_2_phone = ?, 
        party_2_address = ?, 
        party_3_name = ?, 
        party_3_email = ?, 
        party_3_phone = ?, 
        party_3_address = ?, 
        contract_number = ?, 
        contract_date = ?, 
        expiry_date = ?, 
        status = ?, 
        contract_content = ?
      WHERE id = ? AND business_id = ?
    `;

        const [result] = await pool.query(query, [
            party_1_name || null,
            party_1_email || null,
            party_1_phone || null,
            party_1_address || null,
            party_2_name || null,
            party_2_email || null,
            party_2_phone || null,
            party_2_address || null,
            party_3_name || null,
            party_3_email || null,
            party_3_phone || null,
            party_3_address || null,
            contract_number,
            contract_date || null,
            expiry_date || null,
            status || 'draft',
            contract_content || '',
            id,
            business_id
        ]);

        return result.affectedRows > 0;
    },

    delete: async (id, business_id) => {
        const query = 'DELETE FROM contracts WHERE id = ? AND business_id = ?';
        const [result] = await pool.query(query, [id, business_id]);
        return result.affectedRows > 0;
    },

    getLastContractNumber: async (business_id) => {
        const query = `
      SELECT contract_number FROM contracts 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
        const [rows] = await pool.query(query, [business_id]);
        if (rows.length > 0) {
            return rows[0].contract_number;
        }
        return null;
    }
};

module.exports = Contract;
