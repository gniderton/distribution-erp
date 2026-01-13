const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- Helper Functions ---

// 1. Generic GET: Fetch all active rows
const getTable = (table, orderBy = 'id ASC') => async (req, res) => {
    try {
        const query = `SELECT * FROM ${table} WHERE is_active = true ORDER BY ${orderBy}`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        res.status(500).json({ error: err.message });
    }
};

// 2. Generic POST: Create new item (Simple Name/Code)
// tables: brands, categories, master_banks
const createSimple = (table, nameCol, codeCol = null) => async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Build Query
        let query, params;
        if (codeCol) {
            query = `INSERT INTO ${table} (${nameCol}, ${codeCol}, is_active) VALUES ($1, $2, true) RETURNING *`;
            params = [name, code || name.substring(0, 3).toUpperCase()];
        } else {
            query = `INSERT INTO ${table} (${nameCol}, is_active) VALUES ($1, true) RETURNING *`;
            params = [name];
        }

        const result = await pool.query(query, params);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(`Error creating in ${table}:`, err);
        if (err.code === '23505') { // Unique Violation
            return res.status(409).json({ error: 'Item already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

// --- ROUTES ---

// 1. Banks (master_banks)
router.get('/banks', getTable('master_banks', 'bank_name ASC'));
router.post('/banks', createSimple('master_banks', 'bank_name'));

// 2. Brands
router.get('/brands', getTable('brands', 'brand_name ASC'));
router.post('/brands', createSimple('brands', 'brand_name', 'brand_code'));

// 3. Categories
router.get('/categories', getTable('categories', 'category_name ASC'));
router.post('/categories', createSimple('categories', 'category_name', 'category_code'));

// 4. Taxes (Custom Logic for Percent/Type)
router.get('/taxes', getTable('taxes'));
router.post('/taxes', async (req, res) => {
    try {
        const { name, percent, type } = req.body;
        if (!name || percent === undefined) return res.status(400).json({ error: 'Name and Percent are required' });

        const result = await pool.query(
            `INSERT INTO taxes (tax_name, tax_percentage, tax_type, is_active) VALUES ($1, $2, $3, true) RETURNING *`,
            [name, percent, type || 'GST']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating tax:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. HSN Codes (Custom Logic)
router.get('/hsn', getTable('hsn_codes'));
router.post('/hsn', async (req, res) => {
    try {
        const { code, description, tax_id } = req.body;
        if (!code) return res.status(400).json({ error: 'HSN Code is required' });

        const result = await pool.query(
            `INSERT INTO hsn_codes (hsn_code, hsn_description, tax_id, is_active) VALUES ($1, $2, $3, true) RETURNING *`,
            [code, description || '', tax_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating hsn:', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Vendor Addresses (Read-only here, managed via vendors.js)
router.get('/vendor-addresses', getTable('vendor_addresses'));

module.exports = router;
