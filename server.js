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
    if (typeof options === 'function') {
        callback = options;
        options = { family: 4 };
    } else {
        options = { ...options, family: 4 };
    }
    return originalLookup.call(dns, hostname, options, callback);
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
app.use(express.text({ type: 'text/plain', limit: '10mb' })); // Fallback for raw text payloads (Appsmith RAW JSON)

// Health Check (Standard)
app.get('/', (req, res) => {
    res.json({ 
        message: 'Distribution ERP API is running', 
        status: 'Active',
        timestamp: new Date().toISOString()
    });
});

// [NEW] Pure Health Check (No DB, for Render Readiness)
app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
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

// [NEW] Automated Bank Sync (SMS/Email Alerts)
app.use('/api/bank-inbound', require('./routes/bankInbound'));
app.use('/api/sms', require('./routes/bankInbound')); // Shorthand alias

// Import dynamic router
const dynamicRouter = require('./routes/dynamic');
app.use('/api', dynamicRouter);

app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/vendor-payments', require('./routes/vendor_payments'));
app.use('/api/debit-notes', require('./routes/debit_notes')); // [NEW] Debit Notes
app.use('/api/products', require('./routes/products'));
app.use('/api/master', require('./routes/masterData'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/purchase-invoices', require('./routes/purchase_invoices')); // NEW Route
app.use('/api/documents', require('./routes/documents')); // PDF & Sequence Management
app.use('/api/bank-accounts', require('./routes/bank_accounts'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/sales', require('./routes/unified_sales')); // Unified orders + invoices view

app.use('/api/stock/adjust', require('./routes/stock_adjustments'));
app.use('/api/inventory/ledger', require('./routes/inventory_ledger'));

// [NEW] Sales Module Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/analytics', require('./routes/report_generator')); // [NEW] PDF Engine
app.use('/api/dse', require('./routes/dse')); // [NEW] DSE Ops (EOD, etc)
// app.use('/api/delivery', require('./routes/delivery')); // [NEW] Supply Chain / Delivery - REMOVED DUPLICATE
app.use('/api/sales-orders', require('./routes/sales_orders')); // [NEW] Sales Admin
app.use('/api/schemes', require('./routes/schemes')); // [NEW] Scheme Engine
app.use('/api/migration', require('./routes/migration')); // Bulk Data Importer
app.get('/api/company-settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.use('/api/loan-entities', require('./routes/loan_entities')); // Master Data for Loans
app.use('/api/asset-entities', require('./routes/asset_entities')); // [NEW] Master Data for Assets (Vendors/Customers)
app.use('/api/channels', require('./routes/channels')); // [NEW] Channel Maaping
app.use('/api/categories', require('./routes/categories')); // Categories for dropdowns
app.use('/api/sales-returns', require('./routes/sales_returns')); // [NEW] Credit Notes
app.use('/api/entities', require('./routes/entities')); // [NEW] Master entities for Income/Expense
app.use('/api/verify-requests', require('./routes/verify_requests')); // [NEW] Customer Staging & Onboarding
app.use('/api/targets', require('./routes/targets')); // [NEW] Employee Targets & Performance
app.use('/api/ai', require('./routes/ai')); // [NEW] Gemini Vision AI OCR
app.use('/api/eway-bill', require('./routes/eway_bill')); // [NEW] KDK E-Way Bill & Settings
// [NEW] Letterhead Editor & Email Routes
app.use('/api/letters', require('./routes/letters'));

// [NEW] Finance Module
app.use('/api/finance/reconciliation', require('./routes/payment_reconciliation'));
const assetsRoutes = require('./routes/assets');
app.use('/api/assets', assetsRoutes); // [NEW] Asset Management
app.use('/api/finance/reconciliation/bank', require('./routes/bank_recon'));
// [NEW] Accounting & Financial Ledger Routes
app.use('/api/accounting', require('./routes/accounting')); // Standardized path
app.use('/api/finance/accounting', require('./routes/accounting')); // Backwards compatibility
app.use('/api/finance/expenses', require('./routes/expenses')); // [NEW] Expenses Portal
app.use('/api/finance/other-income', require('./routes/other_income')); // [NEW] Non-Operating Income
app.use('/api/finance/cheques', require('./routes/cheques')); // [NEW] Cheque Management
app.use('/api/finance/transfers', require('./routes/transfers')); // [NEW] Internal Transfers
app.use('/api/finance/loans', require('./routes/loans')); // [NEW] Loan Management
app.use('/api', require('./routes/accounting')); // Shorthand for /api/journal-entries
app.use('/api/finance/gst', require('./routes/gst_reports'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/jobs', require('./routes/jobs'));


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

// --- Database Initialization & Migration ---
async function initializeDatabase() {
    try {
        console.log('Connecting to database...');
        const res = await pool.query('SELECT NOW()');
        console.log('Database Connected Successfully:', res.rows[0].now);

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
            { id: '117', path: '117_make_bank_cols_nullable.sql' },
            { id: '118', path: '118_link_bank_statements.sql' },
            { id: '119', path: '119_fix_bank_statement_constraint.sql' },
            { id: '120', path: '120_unblock_vendor_payments_reconciliation.sql' },
            { id: '121', path: '121_asset_management_schema.sql' },
            { id: '122', path: '122_add_gst_to_assets.sql' },
            { id: '123', path: '123_add_sale_gst_to_assets.sql' },
            { id: '124', path: '124_asset_sale_receivable.sql' },
            { id: '125', path: '125_asset_sale_gst_hsn_seq.sql' },
            { id: '126', path: '126_add_addresses_to_asset_sale.sql' },
            { id: '127', path: '127_add_sale_created_by_to_assets.sql' },
            { id: '128', path: '128_internal_transfers_schema.sql' },
            { id: '129', path: '129_add_recon_to_transfers.sql' },
            { id: '130', path: '130_link_statement_to_account.sql' },
            { id: '131', path: '131_loan_management_schema.sql' },
            { id: '132', path: '132_add_loan_sequence.sql' },
            { id: '133', path: '133_vendor_return_slips.sql' },
            { id: '134', path: '134_return_slip_audit.sql' },
            { id: '135', path: '135_sync_dn_rs_sequences.sql' },
            { id: '136', path: '136_fix_ledger_view_sorting.sql' },
            { id: '137', path: '137_emp_designation_to_id.sql' },
            { id: '185', path: '185_employee_targets_schema.sql' },
            { id: '190', path: '190_bank_sync_unique_constraint.sql' },
            { id: '191', path: '191_payment_integrity_triggers.sql' },
            { id: '192', path: '192_eway_bill_and_settings.sql' },
            { id: '204', path: '204_grn_auto_knockoff_payments.sql' },
            { id: '205', path: '205_grn_hard_delete_audit_log.sql' },
            { id: '206', path: '206_grn_transit_knockoff_v2.sql' }
        ];

        for (const m of migrations) {
            const mPath = path.join(__dirname, 'database', m.path);
            if (fs.existsSync(mPath)) {
                try {
                    const sql = fs.readFileSync(mPath, 'utf8');
                    await pool.query(sql);
                    console.log(`Mig ${m.id} Applied/Verified`);
                } catch (e) {
                    if (e.code === '42P07' || e.code === '42710') {
                        console.log(`Mig ${m.id} already exists`);
                    } else {
                        console.error(`Mig ${m.id} Failed:`, e.message);
                    }
                }
            }
        }
    } catch (err) {
        console.error('CRITICAL: Database Initialization Failed!', err.message);
        // We don't exit here because the server should still listen to report its status
    }
}

// Start Server Immediately (Satisfies Render Health Checks)
app.listen(port, () => {
    console.log(`🚀 Server is listening on port ${port}...`);
    console.log(`🛠️ Building environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Run initialization in background
    console.log('📦 Initializing Database in background...');
    initializeDatabase().then(() => {
        console.log('✅ Database Initialization Finished');
        
        // 🛡️ START BACKUP SCHEDULER (2:00 AM Daily)
        const { scheduleNightlyBackup } = require('./services/backupService');
        scheduleNightlyBackup();
        
    }).catch(err => {
        console.error('❌ Database Initialization Failed during startup:', err);
    });
});
