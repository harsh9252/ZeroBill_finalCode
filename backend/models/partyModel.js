const { pool } = require('../config/database');
const Address = require('./addressModel');

// Helper function to convert undefined, empty string, or NaN to null or default
const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const Party = {
  // Create a new party
  create: async (partyData) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Create the party record
      const partyQuery = `
        INSERT INTO parties (
          business_id, party_type, party_name, trade_name, category_id, phone_number, email, gstin, vat, no_tax,
          opening_balance, balance_type, credit_limit, credit_days,
          pan_number, notes, logo,
          contact_person_name, contact_person_phone, meta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const partyValues = [
        partyData.business_id,
        partyData.party_type,
        partyData.party_name,
        sanitizeValue(partyData.trade_name),
        sanitizeValue(partyData.category_id),
        sanitizeValue(partyData.phone_number),
        sanitizeValue(partyData.email),
        sanitizeValue(partyData.gstin),
        sanitizeValue(partyData.vat),
        sanitizeValue(partyData.no_tax, false),
        sanitizeValue(partyData.opening_balance, 0.00),
        sanitizeValue(partyData.balance_type, 'receivable'),
        sanitizeValue(partyData.credit_limit, 0.00),
        sanitizeValue(partyData.credit_days, 0),
        sanitizeValue(partyData.pan_number),
        sanitizeValue(partyData.notes),
        sanitizeValue(partyData.logo),
        sanitizeValue(partyData.contact_person_name),
        sanitizeValue(partyData.contact_person_phone),
        partyData.meta ? (typeof partyData.meta === 'string' ? partyData.meta : JSON.stringify(partyData.meta)) : null
      ];

      const [result] = await connection.execute(partyQuery, partyValues);
      const partyId = result.insertId;

      let billToId = null;
      let shipToId = null;

      // 2. Add multiple billing addresses
      if (partyData.billingAddresses && Array.isArray(partyData.billingAddresses)) {
        const selectedIdx = parseInt(partyData.selectedBillingAddressIndex) || 0;
        for (let i = 0; i < partyData.billingAddresses.length; i++) {
          const addr = partyData.billingAddresses[i];
          // Only save if it has a line1 or city
          if (addr.line1 || addr.billing_address || addr.city) {
            const addrId = await Address.create({
              party_id: partyId,
              attention: addr.attention || null,
              line1: addr.line1 || addr.billing_address || '',
              line2: addr.line2 || null,
              city: addr.city || null,
              state: addr.state || null,
              pincode: addr.pincode || null,
              country: addr.country,
              phone: addr.phone || null,
              fax: addr.fax || null,
              address_type: 'billing'
            }, connection);
            
            // Set as primary if it matches the selected index
            if (i === selectedIdx) billToId = addrId;
            // Fallback: if no primary set yet, set the first one found
            if (!billToId) billToId = addrId;
          }
        }
      }

      // 3. Add multiple shipping addresses
      if (partyData.shippingAddresses && Array.isArray(partyData.shippingAddresses)) {
        const selectedIdx = parseInt(partyData.selectedShippingAddressIndex) || 0;
        for (let i = 0; i < partyData.shippingAddresses.length; i++) {
          const addr = partyData.shippingAddresses[i];
          if (addr.line1 || addr.shipping_address || addr.city) {
            const addrId = await Address.create({
              party_id: partyId,
              attention: addr.attention || null,
              line1: addr.line1 || addr.shipping_address || '',
              line2: addr.line2 || null,
              city: addr.city || null,
              state: addr.state || null,
              pincode: addr.pincode || null,
              country: addr.country,
              phone: addr.phone || null,
              fax: addr.fax || null,
              address_type: 'shipping'
            }, connection);
            
            // Set as primary if it matches the selected index
            if (i === selectedIdx) shipToId = addrId;
            // Fallback: if no primary set yet, set the first one found
            if (!shipToId) shipToId = addrId;
          }
        }
      }

      // 4. Update party with primary address IDs
      if (billToId || shipToId) {
        await connection.execute(
          'UPDATE parties SET bill_to_id = ?, ship_to_id = ? WHERE id = ?',
          [billToId, shipToId, partyId]
        );
      }

      await connection.commit();
      return partyId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get all parties for a business
  findByBusinessId: async (businessId, filters = {}) => {
    // Validate businessId
    if (!businessId || businessId === undefined) {
      throw new Error('businessId is required and cannot be undefined');
    }

    

    let query = `
      SELECT parties.*, parties.vat,
             cats.name as category_name,
             bill_addr.line1 as billing_address, bill_addr.city as bill_city, bill_addr.state as bill_state, bill_addr.pincode as bill_pincode, bill_addr.country as bill_country, 
             ship_addr.line1 as shipping_address, ship_addr.city as ship_city, ship_addr.state as ship_state, ship_addr.pincode as ship_pincode, ship_addr.country as ship_country 
      FROM parties 
      LEFT JOIN items_category cats ON parties.category_id = cats.id
      LEFT JOIN addresses bill_addr ON parties.bill_to_id = bill_addr.id 
      LEFT JOIN addresses ship_addr ON parties.ship_to_id = ship_addr.id 
      WHERE parties.business_id = ?
    `;
    const values = [businessId];

    // Only add filter if it has a valid value
    if (filters.party_type && filters.party_type !== '') {
      query += ' AND (party_type = ? OR party_type = "both")';
      values.push(filters.party_type);
    }

    // Removed explicit is_active filtering as per hard-delete requirement


    // Only add search if it has a value
    if (filters.search && filters.search.trim() !== '') {
      query += ' AND (party_name LIKE ? OR phone_number LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    // Add category filter if provided
    if (filters.category_id && filters.category_id !== '') {
      query += ' AND parties.category_id = ?';
      values.push(filters.category_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, values);
    
    // Transform the rows and fetch all addresses for each party
    const transformedRows = await Promise.all(rows.map(async (row) => {
      // Get all addresses for this party
      const allAddresses = await Address.findByPartyId(row.id);
      
      return {
        ...row,
        meta: row.meta ? (typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta) : {},
        billingAddresses: allAddresses.filter(a => a.address_type === 'billing').map(a => ({
          ...a,
          billing_address: a.line1 // Maintain compatibility
        })),
        shippingAddresses: allAddresses.filter(a => a.address_type === 'shipping').map(a => ({
          ...a,
          shipping_address: a.line1 // Maintain compatibility
        })),
        city: row.bill_city,
        state: row.bill_state,
        pincode: row.bill_pincode,
        country: row.bill_country,
        // Include new fields in flat response for doc snapshotting
        billing_attention: row.bill_attention,
        billing_line2: row.bill_line2,
        billing_phone: row.bill_phone,
        billing_fax: row.bill_fax,
        ship_city: row.ship_city,
        ship_state: row.ship_state,
        ship_pincode: row.ship_pincode,
        ship_country: row.ship_country,
        shipping_attention: row.ship_attention,
        shipping_line2: row.ship_line2,
        shipping_phone: row.ship_phone,
        shipping_fax: row.ship_fax,
        tradeName: row.trade_name,
        partyName: row.party_name,
        vat: row.vat
      };
    }));
    
    return transformedRows;
  },

  // Get party by ID
  findById: async (id, businessId) => {
    const query = `
      SELECT parties.*, parties.vat,
             cats.name as category_name,
             bill_addr.line1 as billing_address, bill_addr.city as bill_city, bill_addr.state as bill_state, bill_addr.pincode as bill_pincode, bill_addr.country as bill_country, 
             ship_addr.line1 as shipping_address, ship_addr.city as ship_city, ship_addr.state as ship_state, ship_addr.pincode as ship_pincode, ship_addr.country as ship_country 
      FROM parties 
      LEFT JOIN items_category cats ON parties.category_id = cats.id
      LEFT JOIN addresses bill_addr ON parties.bill_to_id = bill_addr.id 
      LEFT JOIN addresses ship_addr ON parties.ship_to_id = ship_addr.id 
      WHERE parties.id = ? AND parties.business_id = ?
    `;
    const [rows] = await pool.execute(query, [id, businessId]);
    
    if (rows[0]) {
      const party = rows[0];
      // Get all addresses for this party
      const allAddresses = await Address.findByPartyId(party.id);
      
      return {
        ...party,
        meta: party.meta ? (typeof party.meta === 'string' ? JSON.parse(party.meta) : party.meta) : {},
        billingAddresses: allAddresses.filter(a => a.address_type === 'billing').map(a => ({
          ...a,
          billing_address: a.line1
        })),
        shippingAddresses: allAddresses.filter(a => a.address_type === 'shipping').map(a => ({
          ...a,
          shipping_address: a.line1
        })),
        city: party.bill_city,
        state: party.bill_state,
        pincode: party.bill_pincode,
        country: party.bill_country,
        // Include new fields in flat response for doc snapshotting
        billing_attention: party.bill_attention,
        billing_line2: party.bill_line2,
        billing_phone: party.bill_phone,
        billing_fax: party.bill_fax,
        ship_city: party.ship_city,
        ship_state: party.ship_state,
        ship_pincode: party.ship_pincode,
        ship_country: party.ship_country,
        shipping_attention: party.ship_attention,
        shipping_line2: party.ship_line2,
        shipping_phone: party.ship_phone,
        shipping_fax: party.ship_fax,
        tradeName: party.trade_name,
        partyName: party.party_name,
        vat: party.vat
      };
    }
    
    return rows[0];
  },

  // Update party
  update: async (id, businessId, partyData) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Handle address updates if provided
      // Preserving history: No longer deleting old addresses.
      // We check if identical address exists, otherwise create new.
      
      // Handle Billing Addresses
      if (partyData.billingAddresses !== undefined) {
        const selectedIdx = parseInt(partyData.selectedBillingAddressIndex) || 0;
        let billToId = null;
        if (Array.isArray(partyData.billingAddresses)) {
          for (let i = 0; i < partyData.billingAddresses.length; i++) {
            const addr = partyData.billingAddresses[i];
            if (addr.line1 || addr.billing_address || addr.city) {
              const addressPayload = {
                party_id: id,
                attention: addr.attention || null,
                line1: addr.line1 || addr.billing_address || '',
                line2: addr.line2 || null,
                city: addr.city || null,
                state: addr.state || null,
                pincode: addr.pincode || null,
                country: addr.country,
                phone: addr.phone || null,
                fax: addr.fax || null,
                address_type: 'billing'
              };

              let addrId = addr.id;
              
              if (addrId) {
                // If ID is provided, update existing record
                await Address.update(addrId, addressPayload, connection);
              } else {
                // Otherwise check if identical address exists for this party
                addrId = await Address.findExact(addressPayload, connection);
                if (!addrId) {
                  addrId = await Address.create(addressPayload, connection);
                }
              }
              
              // Set as primary if it matches the selected index
              if (i === selectedIdx) billToId = addrId;
              // Fallback: if no primary set yet, set the first one found
              if (!billToId) billToId = addrId;
            }
          }
        }
        if (billToId) partyData.bill_to_id = billToId;
      }

      // Handle Shipping Addresses
      if (partyData.shippingAddresses !== undefined) {
        const selectedIdx = parseInt(partyData.selectedShippingAddressIndex) || 0;
        let shipToId = null;
        if (Array.isArray(partyData.shippingAddresses)) {
          for (let i = 0; i < partyData.shippingAddresses.length; i++) {
            const addr = partyData.shippingAddresses[i];
            if (addr.line1 || addr.shipping_address || addr.city) {
              const addressPayload = {
                party_id: id,
                attention: addr.attention || null,
                line1: addr.line1 || addr.shipping_address || '',
                line2: addr.line2 || null,
                city: addr.city || null,
                state: addr.state || null,
                pincode: addr.pincode || null,
                country: addr.country,
                phone: addr.phone || null,
                fax: addr.fax || null,
                address_type: 'shipping'
              };

              let addrId = addr.id;

              if (addrId) {
                // If ID is provided, update existing record
                await Address.update(addrId, addressPayload, connection);
              } else {
                // Otherwise check if identical address exists for this party
                addrId = await Address.findExact(addressPayload, connection);
                if (!addrId) {
                  addrId = await Address.create(addressPayload, connection);
                }
              }
              
              // Set as primary if it matches the selected index
              if (i === selectedIdx) shipToId = addrId;
              // Fallback: if no primary set yet, set the first one found
              if (!shipToId) shipToId = addrId;
            }
          }
        }
        if (shipToId) partyData.ship_to_id = shipToId;
      }

      // 2. Perform party update
      const partyFields = [];
      const values = [];

      const fieldsToProcess = {
        party_type: partyData.party_type,
        party_name: partyData.party_name,
        trade_name: partyData.trade_name,
        category_id: partyData.category_id,
        phone_number: partyData.phone_number,
        email: partyData.email,
        gstin: partyData.gstin,
        vat: partyData.vat,
        opening_balance: partyData.opening_balance,
        balance_type: partyData.balance_type,
        credit_limit: partyData.credit_limit,
        credit_days: partyData.credit_days,
        pan_number: partyData.pan_number,
        notes: partyData.notes,
        logo: partyData.logo,
        contact_person_name: partyData.contact_person_name,
        contact_person_phone: partyData.contact_person_phone,
        bill_to_id: partyData.bill_to_id,
        ship_to_id: partyData.ship_to_id,
        no_tax: partyData.no_tax,
        meta: partyData.meta !== undefined ? (typeof partyData.meta === 'string' ? partyData.meta : JSON.stringify(partyData.meta)) : undefined
      };

      for (const [key, value] of Object.entries(fieldsToProcess)) {
        if (value !== undefined) {
          partyFields.push(`${key} = ?`);
          values.push(sanitizeValue(value));
        }
      }

      if (partyFields.length > 0) {
        const updateQuery = `UPDATE parties SET ${partyFields.join(', ')} WHERE id = ? AND business_id = ?`;
        values.push(id, businessId);
        await connection.execute(updateQuery, values);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Delete party (performing hard delete as per requirements)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM parties WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Hard delete party and all its transactions/addresses/bank details
  hardDelete: async (id, businessId) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Delete transactions where party_id matches
      const transactionTables = [
        'quotations',
        'proforma_invoices',
        'sales_invoices',
        'credit_notes',
        'debit_notes',
        'sales_returns',
        'purchase_returns',
        'delivery_challans',
        'book_invoices',
        'book_purchase_orders'
      ];

      for (const table of transactionTables) {
        await connection.execute(`DELETE FROM ${table} WHERE party_id = ? AND business_id = ?`, [id, businessId]);
      }

      // 2. Delete bank details
      await connection.execute('DELETE FROM bank_details WHERE party_id = ? AND business_id = ?', [id, businessId]);

      // 3. Delete addresses (these are associated via party_id)
      await connection.execute('DELETE FROM addresses WHERE party_id = ?', [id]);

      // 4. Finally delete the party record itself
      const [result] = await connection.execute('DELETE FROM parties WHERE id = ? AND business_id = ?', [id, businessId]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get party statistics
  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_parties,
        SUM(CASE WHEN party_type = 'customer' OR party_type = 'both' THEN 1 ELSE 0 END) as total_customers,
        SUM(CASE WHEN party_type = 'vendor' OR party_type = 'both' THEN 1 ELSE 0 END) as total_vendors,
        SUM(CASE WHEN balance_type = 'receivable' THEN opening_balance ELSE 0 END) as total_receivable,
        SUM(CASE WHEN balance_type = 'payable' THEN opening_balance ELSE 0 END) as total_payable
      FROM parties 
      WHERE business_id = ?
    `;
    
    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  }
};

module.exports = Party;
 
