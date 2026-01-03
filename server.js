const dns = require('dns');
// Force IPv4 to avoid ENETUNREACH on some cloud providers (Render -> Supabase)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

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
app.use('/api/products', productRoutes);
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/master', require('./routes/masterData'));
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
