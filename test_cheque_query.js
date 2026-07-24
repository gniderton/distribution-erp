const { pool } = require('./config/db');

async function test() {
    let query = `
        SELECT 
            ch.id, ch.cheque_number, ch.cheque_date, ch.amount, ch.type, 
            ch.party_type, ch.party_id, ch.reference_type, ch.reference_id, 
            ch.status, ch.remarks, ch.clearance_date, ch.bank_account_id, 
            ch.bank_statement_entry_id, ch.created_at, ch.updated_at, ch.bank_id,
            COALESCE(mb.bank_name, ch.bank_name) as bank_name,
            CASE 
                WHEN party_type = 'CUSTOMER' THEN (SELECT customer_name FROM customers WHERE id = party_id)
                WHEN party_type = 'VENDOR' THEN (SELECT vendor_name FROM vendors WHERE id = party_id)
                WHEN party_type = 'INCOME_ENTITY' THEN (SELECT name FROM income_entities WHERE id = party_id)
                WHEN party_type = 'EXPENSE_ENTITY' THEN (SELECT name FROM expense_entities WHERE id = party_id)
                ELSE party_type
            END as party_name
        FROM cheques ch
        LEFT JOIN master_banks mb ON ch.bank_id = mb.id
        WHERE 1=1
        ORDER BY cheque_date ASC, created_at DESC
        LIMIT 2
    `;
    
    try {
        const result = await pool.query(query, []);
        console.log(result.rows);
    } catch (err) {
        console.error("QUERY ERROR:", err.message);
    } finally {
        pool.end();
    }
}

test();
