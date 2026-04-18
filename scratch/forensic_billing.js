const { pool } = require('../config/db');

async function forensicCheck() {
    try {
        console.log("--- DB TIME CHECK ---");
        const timeRes = await pool.query("SELECT CURRENT_DATE, NOW(), timezone('IST', NOW()) as ist_now");
        console.log("Time Data:", timeRes.rows[0]);

        const PIDS = [222, 224];
        for (const pid of PIDS) {
            console.log(`\n--- SIMULATING FIFO FOR PID ${pid} ---`);
            
            // This is the EXACT query from routes/sales.js line 1604
            const query = `
                SELECT id, quantity_remaining, mrp, status, is_active, expiry_date,
                (quantity_remaining > 0) as has_qty,
                (is_active = true) as active,
                (status = 'Good') as is_good,
                (expiry_date IS NULL OR expiry_date >= CURRENT_DATE) as expiry_valid
                FROM inventory_batches 
                WHERE product_id = $1
            `;
            const res = await pool.query(query, [pid]);
            console.table(res.rows);
            
            const filtered = res.rows.filter(r => 
                parseFloat(r.quantity_remaining) > 0 && 
                r.is_active === true && 
                r.status === 'Good' && 
                (r.expiry_date === null || new Date(r.expiry_date) >= new Date(timeRes.rows[0].current_date))
            );
            console.log(`Conclusion for ${pid}: Found ${filtered.length} valid batches after filtering.`);
        }

    } catch (err) {
        console.error("Forensic Error:", err);
    } finally {
        await pool.end();
    }
}

forensicCheck();
