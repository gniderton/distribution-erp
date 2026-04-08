const { pool } = require('../config/db');

async function seedSR() {
    try {
        console.log('Checking for SR (Sales Return) document sequence...');
        const res = await pool.query("SELECT * FROM document_sequences WHERE document_type = 'SR'");
        
        if (res.rows.length === 0) {
            console.log('SR Sequence missing. Inserting...');
            await pool.query(`
                INSERT INTO document_sequences (document_type, prefix, current_number)
                VALUES ('SR', 'SR-', 1)
            `);
            console.log('Successfully seeded SR sequence.');
        } else {
            console.log('SR Sequence already exists:', res.rows[0]);
        }
    } catch (err) {
        console.error('Error seeding SR sequence:', err);
    } finally {
        await pool.end();
    }
}

seedSR();
