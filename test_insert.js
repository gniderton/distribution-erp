const { pool } = require('./config/db'); 
async function test() { 
    const client = await pool.connect(); 
    try { 
        const idRes = await client.query('INSERT INTO sales_invoices (customer_id, invoice_number, invoice_date, grand_total, paid_amount, total_taxable, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [1, 'TEST-20', '2026-04-01', 100, 50, 100, 'Paid']); 
        console.log('Successfully inserted!', idRes.rows[0].id); 
        await client.query('ROLLBACK'); 
    } catch(e) { 
        console.error('Caught query error:', e); 
    } finally { 
        client.release(); pool.end(); 
    } 
} 
test();
