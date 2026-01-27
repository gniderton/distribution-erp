const dns = require('dns');

// CRITICAL FIX: Monkey-patch dns.lookup to force IPv4 globally.
// This is required because Render's Node 20+ environment forces IPv6
// which fails to route to Supabase (ENETUNREACH).
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = { family: 4 }; // Force IPv4
    } else if (!options) {
        options = { family: 4 }; // Force IPv4
    } else {
        options = { ...options, family: 4 }; // Force IPv4
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
app.use(express.json()); // Parse JSON bodies

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Distribution ERP API is running', status: 'Active' });
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
app.use('/api/sales', require('./routes/sales')); // [NEW] Sales Allocation Logic
app.use('/api/stock/adjust', require('./routes/stock_adjustments')); // [NEW] Stock Logic

// Database Connection Test & Server Start
const fs = require('fs');
const path = require('path');

// Database Connection Test & Server Start
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database Connection Failed:', err);
    } else {
        console.log('Database Connected Successfully:', res.rows[0].now);

        // --- AUTO-MIGRATION SECTION (TEMPORARY FIX) ---
        try {
            // 1. Rounding Fix (040)
            const mig040 = path.join(__dirname, 'database', '040_fix_grn_rounding.sql');
            if (fs.existsSync(mig040)) {
                pool.query(fs.readFileSync(mig040, 'utf8'), (e) => {
                    if (e) console.error('Mig 040 Failed', e); else console.log('Mig 040 Applied');
                });
            }

            // 2. Smart GST Logic (041)
            const mig041 = path.join(__dirname, 'database', '041_smart_gst_logic.sql');
            if (fs.existsSync(mig041)) {
                pool.query(fs.readFileSync(mig041, 'utf8'), (e) => {
                    if (e) console.error('Mig 041 Failed', e); else console.log('Mig 041 Applied');
                });
            }
        } catch (migEx) {
            console.error('Migration Error:', migEx);
        }
        // ----------------------------------------------

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    }
});
