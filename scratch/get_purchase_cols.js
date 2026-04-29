const { pool } = require('../config/db');

async function getCols() {
    try {
        const res = await pool.query("SELECT * FROM purchase_invoice_headers LIMIT 1");
        if (res.rows.length > 0) {
            console.log(Object.keys(res.rows[0]));
        } else {
            console.log('No data in purchase_invoice_headers');
        }
    } finally {
        await pool.end();
    }
}

getCols();
