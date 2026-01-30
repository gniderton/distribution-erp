const { pool } = require('./config/db');

async function debug() {
    try {
        const res = await pool.query(`
            SELECT 
                c.id, 
                c.customer_name, 
                c.channel_id, 
                ch.channel_name, 
                ch.price_column as default_price_col 
            FROM customers c 
            LEFT JOIN channels ch ON c.channel_id = ch.id 
            WHERE c.id = 259
        `);
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debug();
