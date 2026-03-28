const { pool } = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO chart_of_accounts (code, name, type, is_active)
            VALUES 
                (5014, 'Salary Expense', 'EXPENSE', true),
                (5015, 'Salary Deductions', 'EXPENSE', true)
            ON CONFLICT (code) DO UPDATE SET 
                name = EXCLUDED.name, 
                type = EXCLUDED.type;
        `);
        console.log('Salary accounts created/updated successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
