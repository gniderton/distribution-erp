const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function check() {
    try {
        console.log('--- Employee Advance (id: 1) ---');
        const adv = await pool.query('SELECT * FROM employee_advances WHERE id = 1');
        console.log(JSON.stringify(adv.rows[0], null, 2));

        console.log('\n--- Bank Statement Entry (id: 1280) ---');
        const bse = await pool.query('SELECT * FROM bank_statement_entries WHERE id = 1280');
        console.log(JSON.stringify(bse.rows[0], null, 2));

        if (adv.rows[0] && adv.rows[0].journal_entry_id) {
            console.log('\n--- Journal Entry (id: ' + adv.rows[0].journal_entry_id + ') ---');
            const je = await pool.query('SELECT * FROM journal_entries WHERE id = $1', [adv.rows[0].journal_entry_id]);
            console.log(JSON.stringify(je.rows[0], null, 2));

            console.log('\n--- Journal Lines for Journal Entry ---');
            const le = await pool.query('SELECT * FROM journal_lines WHERE journal_entry_id = $1', [adv.rows[0].journal_entry_id]);
            console.log(JSON.stringify(le.rows, null, 2));

            const accountIds = le.rows.map(r => r.account_id);
            console.log('\n--- Chart of Accounts ---');
            const coa = await pool.query('SELECT * FROM chart_of_accounts WHERE id = ANY($1)', [accountIds]);
            console.log(JSON.stringify(coa.rows, null, 2));
        }

        console.log('\n--- Bank Account (id: 3) ---');
        const ba = await pool.query('SELECT * FROM bank_accounts WHERE id = 3');
        console.log(JSON.stringify(ba.rows[0], null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
