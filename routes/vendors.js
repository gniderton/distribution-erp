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
        pan, address_line1, address_line2, state, district, pin_code,
        bank_name, bank_account_no, bank_ifsc
    } = req.body;

    if (!vendor_name) {
        return res.status(400).json({ error: 'Vendor Name is required' });
    }

    try {
        await pool.query('BEGIN');

        // 1. Auto-Generate Code: GD-VD-001
        if (!vendor_code) {
            const prefix = 'GD-VD-';
            const lastCodeRes = await pool.query(
                `SELECT vendor_code FROM vendors 
                 WHERE vendor_code LIKE $1 
                 ORDER BY id DESC LIMIT 1`,
                [`${prefix}%`]
            );

            let nextNum = 1;
            if (lastCodeRes.rows.length > 0) {
                const lastCode = lastCodeRes.rows[0].vendor_code;
                // Remove prefix and parse (handle cases like GD-VD-005)
                const suffix = lastCode.replace(prefix, '');
                const num = parseInt(suffix);
                if (!isNaN(num)) {
                    nextNum = num + 1;
                }
            }
            // Format: GD-VD-001
            vendor_code = `${prefix}${String(nextNum).padStart(3, '0')}`;
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
                (vendor_id, address_line, district, state_code, pin_code, is_default, is_active)
                VALUES ($1, $2, $3, $4, $5, true, true)
                RETURNING id
            `, [vendorId, fullAddress, district, state, pin_code]);

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

// End of POST logic

// GET /api/vendors/:id - Fetch single vendor with aggregated Stats
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Basic Info
        const vendorRes = await pool.query(`SELECT * FROM vendors WHERE id = $1`, [id]);
        if (vendorRes.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vendorRes.rows[0];

        // 2. Get Statistics (Optimized Ledger Query)
        // Note: Using view_vendor_ledger is safest for balance, but direct sum is faster for specific KPIs.
        // Let's use direct table sums for clarity and performance.
        const statsRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM purchase_order_headers WHERE vendor_id = $1) as total_pos,
                (SELECT COALESCE(SUM(grand_total), 0) FROM purchase_invoice_headers WHERE vendor_id = $1 AND status != 'Cancelled') as total_billed,
                (SELECT COALESCE(SUM(amount), 0) FROM vendor_payments WHERE vendor_id = $1 AND is_active = true) as total_paid_cash,
                (SELECT COALESCE(SUM(amount), 0) FROM debit_notes WHERE vendor_id = $1 AND status = 'Approved') as total_debit_notes
        `, [id]);

        const stats = statsRes.rows[0];
        const totalBilled = parseFloat(stats.total_billed);
        const totalPaid = parseFloat(stats.total_paid_cash) + parseFloat(stats.total_debit_notes);
        const pendingBalance = totalBilled - totalPaid;

        res.json({
            ...vendor,
            stats: {
                total_pos: parseInt(stats.total_pos),
                total_billed: totalBilled,
                total_paid: totalPaid,
                pending_balance: pendingBalance
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching vendor details' });
    }
});

// PUT /api/vendors/:id - Update vendor details
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            vendor_name, contact_person, contact_no, email, gst,
            pan, bank_name, bank_account_no, bank_ifsc
        } = req.body;

        const result = await pool.query(
            `UPDATE vendors SET 
                vendor_name = COALESCE($1, vendor_name),
                contact_person = COALESCE($2, contact_person),
                contact_no = COALESCE($3, contact_no),
                email = COALESCE($4, email),
                gst = COALESCE($5, gst),
                pan = COALESCE($6, pan),
                bank_name = COALESCE($7, bank_name),
                bank_account_no = COALESCE($8, bank_account_no),
                bank_ifsc = COALESCE($9, bank_ifsc)
             WHERE id = $10
             RETURNING *`,
            [
                vendor_name, contact_person, contact_no, email, gst,
                pan, bank_name, bank_account_no, bank_ifsc,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error updating vendor' });
    }
});
router.get('/:id/addresses', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM vendor_addresses WHERE vendor_id = $1 ORDER BY is_default DESC, id ASC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching addresses' });
    }
});

// POST /api/vendors/:id/addresses - Add new address
router.post('/:id/addresses', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params; // vendor_id
        const {
            address_list_name, // e.g. "Factory B" - Not used in schema yet, mapped to 'area' or just ignored? Schema has address_line, city etc.
            address_line,
            city,
            state_code,
            pin_code,
            is_default
        } = req.body;

        await client.query('BEGIN');

        // 1. If Default, unset others
        if (is_default) {
            await client.query(
                `UPDATE vendor_addresses SET is_default = false WHERE vendor_id = $1`,
                [id]
            );

            // 2. Sync to Parent Vendor Table (Keep Default Snapshot)
            // Note: Schema 'state' column vs 'state_code'. We assume state_code carries the name for now or simple string.
            await client.query(
                `UPDATE vendors SET 
                    address_line1 = $1, 
                    state = $2 
                 WHERE id = $3`,
                [address_line, state_code, id]
            );
        }

        // 3. Insert new address
        const result = await client.query(
            `INSERT INTO vendor_addresses 
            (vendor_id, address_line, city, state_code, pin_code, is_default, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING *`,
            [id, address_line, city, state_code, pin_code, !!is_default]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error creating address' });
    } finally {
        client.release();
    }
});

module.exports = router;
