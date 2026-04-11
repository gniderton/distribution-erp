
const { pool } = require('./config/db');

async function findRecords() {
    try {
        const invoices = ['GIV-26-7659', 'GIV-26-7667', 'PEN-26-00001'];
        const invRes = await pool.query('SELECT id, invoice_number, invoice_date, grand_total FROM sales_invoices WHERE invoice_number = ANY($1)', [invoices]);
        
        console.log('--- Invoices ---');
        console.table(invRes.rows);

        const chqRes = await pool.query(`
            SELECT id, cheque_number, bounce_date, amount, status 
            FROM cheques 
            WHERE party_id = 269 AND status = 'BOUNCED'
        `);
        
        console.log('--- Bounced Cheques ---');
        console.table(chqRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findRecords();
