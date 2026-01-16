require('dotenv').config({ path: '../.env' }); // Adjust path if needed, assuming running from /database
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const csvFilePath = path.join(__dirname, '../HSN to Backened.csv');

async function seedHSN() {
    const client = await pool.connect();
    try {
        console.log('Starting HSN Import...');
        await client.query('BEGIN');

        // Optional: Clear existing if you want a clean slate? 
        // Or just upsert. Let's upsert to be safe.
        // await client.query('TRUNCATE TABLE hsn_codes RESTART IDENTITY CASCADE');

        const records = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => records.push(data))
            .on('end', async () => {
                console.log(`Found ${records.length} records in CSV.`);
                if (records.length > 0) {
                    console.log('DEBUG First Row Keys:', Object.keys(records[0]));
                    console.log('DEBUG First Row Data:', records[0]);
                }

                // Helper to find key ignoring BOM
                const findKey = (obj, target) => Object.keys(obj).find(k => k.trim().includes(target));

                for (const row of records) {
                    // Dynamically find the keys to handle BOM or potential casing
                    const codeKey = findKey(row, 'HSN_Code');
                    const descKey = findKey(row, 'Description');
                    const taxKey = findKey(row, 'Tax_Percent');

                    const hsnCode = row[codeKey];
                    const desc = row[descKey];
                    const taxId = row[taxKey];

                    if (!hsnCode) {
                        console.log('Skipping row (missing code):', row);
                        continue;
                    }

                    // Upsert Logic
                    const query = `
                INSERT INTO hsn_codes (hsn_code, hsn_description, tax_id, is_active)
                VALUES ($1, $2, $3, true)
                ON CONFLICT (hsn_code) 
                DO UPDATE SET 
                    hsn_description = EXCLUDED.hsn_description,
                    tax_id = EXCLUDED.tax_id,
                    is_active = true
            `;

                    await client.query(query, [hsnCode, desc, taxId]);
                }

                await client.query('COMMIT');
                console.log('HSN Import Completed Successfully!');
                process.exit(0);
            });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error importing HSN:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedHSN();
