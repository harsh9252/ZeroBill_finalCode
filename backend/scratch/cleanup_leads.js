const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function cleanupSoftDeletedLeads() {
    try {
        console.log('Starting cleanup of soft-deleted sales leads...');
        const [result] = await pool.execute('DELETE FROM sales_leads WHERE is_active = FALSE');
        console.log(`Successfully deleted ${result.affectedRows} soft-deleted leads.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupSoftDeletedLeads();
