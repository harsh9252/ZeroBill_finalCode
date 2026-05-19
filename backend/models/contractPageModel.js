const { pool } = require('../config/database');

const ContractPage = {
  // Sync pages for a specific contract
  syncContractPages: async (contractId, businessId, pages) => {
    if (!pages || !Array.isArray(pages)) return true;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get current pages in DB
      const [currentRows] = await connection.execute(
        'SELECT id FROM contract_pages WHERE contract_id = ? AND business_id = ?',
        [contractId, businessId]
      );
      const currentIds = currentRows.map(row => Number(row.id));

      // 2. Identify IDs to delete (those and current but not in incoming)
      const incomingIds = pages.filter(p => p.id && Number(p.id) < 1000000000).map(p => Number(p.id));
      const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await connection.query('DELETE FROM contract_pages WHERE id IN (?)', [idsToDelete]);
      }

      // 3. Update or Insert pages
      for (const [index, page] of pages.entries()) {
        const pageId = page.id ? Number(page.id) : null;
        const isNewPage = !pageId || pageId >= 1000000000 || !currentIds.includes(pageId);

        const pageData = {
          contract_id: contractId,
          business_id: businessId,
          heading: page.heading || 'New Page',
          content: page.content || '',
          page_order: page.page_order || index + 1,
          is_locked: (page.is_locked === true || page.is_locked === 1 || page.is_locked === '1') ? 1 : 0
        };

        if (isNewPage) {
          const fields = Object.keys(pageData);
          const placeholders = fields.map(() => '?').join(', ');
          const values = Object.values(pageData);
          
          await connection.execute(
            `INSERT INTO contract_pages (${fields.join(', ')}) VALUES (${placeholders})`,
            values
          );
        } else {
          const fields = Object.keys(pageData);
          const updateStr = fields.map(f => `${f} = ?`).join(', ');
          const values = [...Object.values(pageData), pageId];
          
          await connection.execute(
            `UPDATE contract_pages SET ${updateStr} WHERE id = ?`,
            values
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error syncing contract pages:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get all pages for a contract
  getByContractId: async (contractId, businessId) => {
    const query = 'SELECT * FROM contract_pages WHERE contract_id = ? AND business_id = ? ORDER BY page_order ASC';
    const [rows] = await pool.execute(query, [contractId, businessId]);
    return rows;
  },

  // Toggle lock status
  toggleLock: async (id, businessId) => {
    const [rows] = await pool.execute('SELECT is_locked FROM contract_pages WHERE id = ? AND business_id = ?', [id, businessId]);
    if (rows.length === 0) throw new Error('Page not found');

    const newLockStatus = rows[0].is_locked ? 0 : 1;
    await pool.execute('UPDATE contract_pages SET is_locked = ? WHERE id = ? AND business_id = ?', [newLockStatus, id, businessId]);
    return { success: true, is_locked: newLockStatus };
  },

  // Get unique locked pages for a business (templates)
  getLockedPagesByBusinessId: async (businessId) => {
    const query = `
      SELECT t1.* FROM contract_pages t1
      INNER JOIN (
          SELECT MAX(id) as id 
          FROM contract_pages 
          WHERE business_id = ? AND is_locked = 1
          GROUP BY heading, content
      ) t2 ON t1.id = t2.id
      ORDER BY t1.page_order ASC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  }
};

module.exports = ContractPage;
