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

app.use('/api/vendors', vendorRoutes);
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/vendor-payments', require('./routes/vendor_payments'));
app.use('/api/debit-notes', require('./routes/debit_notes')); // [NEW] Debit Notes
app.use('/api/products', require('./routes/products'));
app.use('/api/master', require('./routes/masterData'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/purchase-invoices', require('./routes/purchase_invoices')); // NEW Route
app.use('/api/documents', require('./routes/documents'));

// Database Connection Test & Server Start
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database Connection Failed:', err);
    } else {
        console.log('Database Connected Successfully:', res.rows[0].now);
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    }
});
