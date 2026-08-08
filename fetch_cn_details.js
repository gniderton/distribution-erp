const { pool } = require('./config/db');
const fs = require('fs');

async function run() {
    try {
        const res = await pool.query(`
            SELECT 
                c.customer_name,
                sr.return_number as credit_note,
                sr.grand_total as original_amount,
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE return_id = sr.id AND status = 'ACTIVE'), 0) as consumed_amount,
                ca.amount as newly_converted_advance
            FROM customer_advances ca
            JOIN sales_returns sr ON ca.return_id = sr.id
            JOIN customers c ON sr.customer_id = c.id
            WHERE ca.return_id IS NOT NULL
            ORDER BY ca.amount DESC;
        `);
        
        let md = `| Customer Name | Credit Note | Original Amount | Consumed Amount | Newly Converted Advance |\n`;
        md += `|---|---|---|---|---|\n`;
        for (const row of res.rows) {
            md += `| ${row.customer_name} | ${row.credit_note} | $${row.original_amount} | $${row.consumed_amount} | $${row.newly_converted_advance} |\n`;
        }
        
        fs.writeFileSync('cn_details.md', md);
        console.log('Done');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
