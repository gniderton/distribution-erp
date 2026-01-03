const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/vendors - Fetch all vendors with pagination & search
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;

        // Logic: Search by Code, Name, or GST
        const searchClause = search
            ? `WHERE vendor_name ILIKE $1 OR vendor_code ILIKE $1 OR gst ILIKE $1`
            : '';
        const params = search ? [`%${search}%`, limit, offset] : [limit, offset];

        // Adjust param indexes based on search existence
        const limitIdx = search ? 2 : 1;
        const offsetIdx = search ? 3 : 2;

        const query = `
      SELECT * FROM vendors
      ${searchClause}
      ORDER BY id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

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
    // Logic: Insert new vendor. 
    // Strict: Requires at least vendor_code and vendor_name
    const { vendor_code, vendor_name, contact_person, contact_no, email, gst } = req.body;

    if (!vendor_code || !vendor_name) {
        return res.status(400).json({ error: 'Vendor Code and Name are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO vendors (vendor_code, vendor_name, contact_person, contact_no, email, gst)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [vendor_code, vendor_name, contact_person, contact_no, email, gst]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Vendor Code already exists' });
        }
        res.status(500).json({ error: 'Database error creating vendor' });
    }
});

module.exports = router;
