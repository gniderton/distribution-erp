const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/vendors - Fetch all vendors with pagination & search
// GET /api/vendors - Fetch all vendors with pagination & search
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit, search = '' } = req.query; // limit defaults to undefined

        // Logic: Search by Code, Name, or GST
        const searchClause = search
            ? `WHERE vendor_name ILIKE $1 OR vendor_code ILIKE $1 OR gst ILIKE $1`
            : '';
        const params = search ? [`%${search}%`] : [];
        let paramIdx = search ? 2 : 1;

        let query = `
      SELECT * FROM vendors
      ${searchClause}
      ORDER BY id ASC
    `;

        if (limit) {
            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
            params.push(limit, offset);
        }

        // Count for Pagination Code
        const countQuery = `SELECT COUNT(*) FROM vendors ${searchClause}`;
        const countParams = search ? [`%${search}%`] : [];

        const [rows, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        res.json({
            data: rows.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching vendors' });
    }
});

// POST /api/vendors - Create new vendor
router.post('/', async (req, res) => {
    let {
        vendor_code, vendor_name, contact_person, contact_no, email, gst,
        pan, address_line1, address_line2, state, district,
        bank_name, bank_account_no, bank_ifsc
    } = req.body;

    if (!vendor_name) {
        return res.status(400).json({ error: 'Vendor Name is required' });
    }

    try {
        await pool.query('BEGIN');

        // 1. Auto-Generate Code
        if (!vendor_code) {
            const lastCodeRes = await pool.query('SELECT vendor_code FROM vendors ORDER BY id DESC LIMIT 1');
            if (lastCodeRes.rows.length > 0) {
                const lastCode = lastCodeRes.rows[0].vendor_code;
                const num = parseInt(lastCode.replace(/\D/g, '')) || 0;
                vendor_code = `V${String(num + 1).padStart(3, '0')}`;
            } else {
                vendor_code = 'V001';
            }
        }

        // 2. Insert Vendor (Basic Info + Bank)
        // Note: keeping address cols in vendors for backward compat or cache, 
        // but MAJORLY inserting into vendor_addresses below.
        const vendorRes = await pool.query(
            `INSERT INTO vendors (
                vendor_code, vendor_name, contact_person, contact_no, email, gst,
                pan, bank_name, bank_account_no, bank_ifsc
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, vendor_code, vendor_name`,
            [
                vendor_code, vendor_name, contact_person, contact_no, email, gst,
                pan, bank_name, bank_account_no, bank_ifsc
            ]
        );
        const vendorId = vendorRes.rows[0].id;

        // 3. Insert Address (If provided)
        if (address_line1 || district || state) {
            const fullAddress = [address_line1, address_line2].filter(Boolean).join(', ');

            const addrRes = await pool.query(`
                INSERT INTO vendor_addresses 
                (vendor_id, address_line, district, state_code, is_default, is_active)
                VALUES ($1, $2, $3, $4, true, true)
                RETURNING id
            `, [vendorId, fullAddress, district, state]);

            // 4. Link Address Content back to Vendor (Optional, but good for quick lookup)
            await pool.query('UPDATE vendors SET vendor_address_id = $1 WHERE id = $2', [addrRes.rows[0].id, vendorId]);
        }

        await pool.query('COMMIT');
        res.status(201).json(vendorRes.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Vendor Code already exists' });
        }
        res.status(500).json({ error: 'Database error creating vendor' });
    }
});
// End of POST logic

module.exports = router;
