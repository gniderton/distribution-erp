const { pool } = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Creating employee_bonuses table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS employee_bonuses (
                id SERIAL PRIMARY KEY,
                employee_id INT REFERENCES employees(id),
                amount DECIMAL(15, 2) NOT NULL,
                bonus_date DATE NOT NULL,
                bonus_type VARCHAR(50), -- 'MANUAL', 'LEAVE_ENCASHMENT', 'FESTIVAL'
                remarks TEXT,
                is_settled BOOLEAN DEFAULT FALSE,
                salary_payment_id INT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('2. Provisioning accounting codes (5016, 5017)...');
        await client.query(`
            INSERT INTO chart_of_accounts (code, name, type, is_active)
            VALUES 
                (5016, 'Bonus Expense', 'EXPENSE', true),
                (5017, 'Leave Encashment Expense', 'EXPENSE', true)
            ON CONFLICT (code) DO NOTHING
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
