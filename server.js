const dns = require('dns');

// CRITICAL FIX: Monkey-patch dns.lookup to force IPv4 globally.
// This is required because Render's Node 20+ environment forces IPv6
// which fails to route to Supabase (ENETUNREACH).
// CRITICAL FIX: Monkey-patch dns.lookup to force IPv4 globally.
// This is required because Render's Node 20+ environment defaults to IPv6,
// but the Supabase IPv4 Pooler (aws-0-ap-southeast-2.pooler.supabase.com)
// usually requires explicit IPv4 resolution in this specific environment.
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    // If options is a callback, shift arguments
    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else if (!options) {
        options = {};
    }

    // Force IPv4 for Supabase Pooler domains to prevent ETIMEOUT/ENETUNREACH
    // caused by Render trying to reach IPv6 addresses that don't accept the connection.
    if (hostname && (hostname.includes('supabase.com') || hostname.includes('pooler'))) {
        options = { ...options, family: 4, hints: dns.ADDRCONFIG | dns.V4MAPPED };
    }

    return originalLookup(hostname, options, callback);
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow Retool to access this API
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (increased for bank statements)

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Distribution ERP API is running', status: 'Active' });
});

// [DEBUG] DB Info
app.get('/api/debug/db-info', async (req, res) => {
    try {
        const result = await pool.query("SELECT current_database(), inet_server_addr(), (SELECT count(*) FROM delivery_trips) as trip_count");
        res.json({
            database: result.rows[0].current_database,
            server_addr: result.rows[0].inet_server_addr,
            trip_count: result.rows[0].trip_count,
            env: process.env.NODE_ENV || 'development'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import Routes
const vendorRoutes = require('./routes/vendors');
const productRoutes = require('./routes/products');

app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/vendor-payments', require('./routes/vendor_payments'));
app.use('/api/debit-notes', require('./routes/debit_notes')); // [NEW] Debit Notes
app.use('/api/products', require('./routes/products'));
app.use('/api/master', require('./routes/masterData'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/purchase-invoices', require('./routes/purchase_invoices')); // NEW Route
app.use('/api/documents', require('./routes/documents'));
app.use('/api/bank-accounts', require('./routes/bank_accounts'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/sales', require('./routes/unified_sales')); // Unified orders + invoices view

app.use('/api/stock/adjust', require('./routes/stock_adjustments'));

// [NEW] Sales Module Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/dse', require('./routes/dse')); // [NEW] DSE Ops (EOD, etc)
// app.use('/api/delivery', require('./routes/delivery')); // [NEW] Supply Chain / Delivery - REMOVED DUPLICATE
app.use('/api/sales-orders', require('./routes/sales_orders')); // [NEW] Sales Admin
app.use('/api/schemes', require('./routes/schemes')); // [NEW] Scheme Engine
app.use('/api/channels', require('./routes/channels')); // [NEW] Channel Maaping
app.use('/api/categories', require('./routes/categories')); // Categories for dropdowns
app.use('/api/sales-returns', require('./routes/sales_returns')); // [NEW] Credit Notes

// [NEW] Finance Module
app.use('/api/finance/reconciliation', require('./routes/payment_reconciliation'));
app.use('/api/finance/reconciliation/bank', require('./routes/bank_recon'));
app.use('/api/finance/accounting', require('./routes/accounting'));
app.use('/api/finance/expenses', require('./routes/expenses')); // [NEW] Expenses Portal
app.use('/api/finance/other-income', require('./routes/other_income')); // [NEW] Non-Operating Income
app.use('/api/finance/cheques', require('./routes/cheques')); // [NEW] Cheque Management
app.use('/api', require('./routes/accounting')); // [NEW] Alias for shorter paths like /api/journal-entries

// [TEMP] Migration Endpoint to fix Combo Schema
app.get('/api/fix-combo-db', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { pool } = require('./config/db');

        const sqlPath = path.join(__dirname, 'database', '079_fix_combo_trigger_id.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        res.send('<h1>✅ Migration Successful!</h1><p>Combo schemes explicitly fixed. You can now create combo schemes.</p>');
    } catch (err) {
        res.status(500).send(`<h1>❌ Migration Failed</h1><pre>${err.message}</pre>`);
    }
});

// [TEMP] Reset Sales Module Data
app.get('/api/reset-sales-data', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { pool } = require('./config/db');

        const sqlPath = path.join(__dirname, 'database', '080_reset_sales_module.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        res.send('<h1>✅ Sales Data Reset Successful!</h1><p>Cleared: Schemes, Orders, Invoices, Deliveries, Payments.<br>Preserved: Products, Customers, Inventory.</p>');
    } catch (err) {
        res.status(500).send(`<h1>❌ Reset Failed</h1><pre>${err.message}</pre>`);
    }
});

// Database Connection Test & Server Start
const fs = require('fs');
const path = require('path');

// Database Connection Test & Server Start
pool.query('SELECT NOW()', async (err, res) => {
    if (err) {
        console.error('Database Connection Failed:', err);
    } else {
        console.log('Database Connected Successfully:', res.rows[0].now);

        // --- AUTO-MIGRATION SECTION (TEMPORARY FIX) ---
        const migrations = [
            { id: '040', path: '040_fix_grn_rounding.sql' },
            { id: '041', path: '041_smart_gst_logic.sql' },
            { id: '042', path: '042_add_gst_columns.sql' },
            { id: '071', path: '071_stock_traceability.sql' },
            { id: '072', path: '072_sales_invoice_lines.sql' },
            { id: '064', path: '064_bank_statement_schema.sql' },
            { id: '065', path: '065_bank_statement_unique_constraint.sql' },
            { id: '083', path: '083_full_statement_schema.sql' },
            { id: '084', path: '084_fix_bank_amount_constraint.sql' },
            { id: '085', path: '085_enhanced_verification_schema.sql' },
            { id: '101', path: '101_trip_returns_batch_condition.sql' },
            { id: '102', path: '102_sync_logs.sql' },
            { id: '114', path: '114_other_income_schema.sql' },
            { id: '115', path: '115_other_income_gst.sql' },
            { id: '116', path: '116_cheque_management.sql' },
            { id: '117', path: '117_make_bank_cols_nullable.sql' }
        ];

        for (const m of migrations) {
            const mPath = path.join(__dirname, 'database', m.path);
            if (fs.existsSync(mPath)) {
                try {
                    const sql = fs.readFileSync(mPath, 'utf8');
                    await pool.query(sql);
                    console.log(`Mig ${m.id} Applied/Verified`);
                } catch (e) {
                    // Ignore "already exists" errors (42P07, 42710)
                    if (e.code === '42P07' || e.code === '42710') {
                        console.log(`Mig ${m.id} already exists, skipping.`);
                    } else {
                        console.error(`Mig ${m.id} Failed:`, e.message);
                    }
                }
            }
        }
        // ----------------------------------------------
        // ----------------------------------------------
        // ----------------------------------------------

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    }
});
