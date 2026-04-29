const { pool } = require('../config/db');

async function findUnallocatedReturns() {
    console.log('--- Checking for Unallocated Sales Returns ---');
    try {
        const res = await pool.query(`
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.return_date, 
                sr.grand_total, 
                sr.status,
                c.customer_name,
                (SELECT SUM(amount) FROM customer_payment_allocations WHERE return_id = sr.id) as allocated_amount
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            WHERE sr.status != 'Cancelled' AND sr.is_active = true
            AND NOT EXISTS (SELECT 1 FROM customer_payment_allocations WHERE return_id = sr.id)
        `);

        if (res.rows.length === 0) {
            console.log('✅ All Sales Returns are allocated.');
        } else {
            console.log(`⚠️ Found ${res.rows.length} Unallocated Sales Returns!`);
            console.table(res.rows);
        }

        // Also check for partial allocations
        const partial = await pool.query(`
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.grand_total, 
                SUM(cpa.amount) as allocated_total
            FROM sales_returns sr
            JOIN customer_payment_allocations cpa ON sr.id = cpa.return_id
            WHERE sr.status != 'Cancelled' AND sr.is_active = true
            GROUP BY sr.id, sr.return_number, sr.grand_total
            HAVING ABS(SUM(cpa.amount) - sr.grand_total) > 0.1
        `);

        if (partial.rows.length > 0) {
            console.log(`⚠️ Found ${partial.rows.length} Partially Allocated Sales Returns!`);
            console.table(partial.rows);
        }

    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

findUnallocatedReturns();
