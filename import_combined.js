const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');
const csv = require('csv-parse');

const filePath = path.join(__dirname, 'Combined.csv');

async function importCombined() {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse CSV
    const records = [];
    const parser = csv.parse(fileContent, {
        columns: false, // We use index based mapping
        skip_empty_lines: true,
        relax_column_count: true,
        from_line: 2 // Skip header
    });

    parser.on('readable', function () {
        let record;
        while ((record = parser.read()) !== null) {
            records.push(record);
        }
    });

    parser.on('error', function (err) {
        console.error(err.message);
    });

    parser.on('end', async function () {
        console.log(`Parsed ${records.length} records. Starting import...`);
        await processRecords(records);
    });
}

async function processRecords(records) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Prepare statements for performance
        // Customer Columns: A(0) to N(13)
        // Address Columns: O(14) to W(22)

        let inserted = 0;

        for (const cols of records) {
            // --- 1. Customer Data (Cols 0-13) ---
            const customer_name = cols[1]?.trim();
            if (!customer_name) continue; // Skip empty rows

            // Phone: Clean scientific notation if present (e.g. 9.19E+11)
            let rawPhone = cols[2]?.trim();
            if (rawPhone && rawPhone.includes('E')) {
                rawPhone = Number(rawPhone).toString();
            }
            const customer_phone = rawPhone || null;

            const email = cols[3]?.trim() === '0' ? null : cols[3]?.trim();
            const gstin = cols[4]?.trim() === '0' ? null : cols[4]?.trim();
            const pan = cols[5]?.trim() === '0' ? null : cols[5]?.trim();

            const credit_limit = parseFloat(cols[6]) || 0;
            const credit_days = parseInt(cols[7]) || 0;

            const route_id = parseInt(cols[8]) || null;
            const dse_id = parseInt(cols[9]) || null;
            const is_active = cols[10]?.trim().toLowerCase() === 'true';

            // IMPORTANT: Channel ID Default to 3 (Dealer) if missing
            const channel_id = parseInt(cols[11]) || 3;

            const customer_code = cols[12]?.trim();
            const route_type_id = parseInt(cols[13]) || 1;

            // Insert Customer
            const custRes = await client.query(`
                INSERT INTO customers (
                    customer_name, customer_phone, email, gstin, pan, 
                    credit_limit, credit_days, route_id, dse_id, is_active, 
                    channel_id, customer_code, route_type_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                customer_name, customer_phone, email, gstin, pan,
                credit_limit, credit_days, route_id, dse_id, is_active,
                channel_id, customer_code, route_type_id
            ]);

            const newCustId = custRes.rows[0].id;

            // --- 2. Address Data (Cols 14-22) ---
            // Col 16 = Address Line 1
            const addr1 = cols[16]?.trim();
            const addr2 = cols[17]?.trim();
            const city = cols[18]?.trim();
            const state = cols[19]?.trim();
            const pincode = cols[20]?.trim();

            // If address exists, insert it
            if (addr1 || city) {
                await client.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, address_line2, city, state, pincode, is_default_billing, is_default_shipping
                    ) VALUES ($1, $2, $3, $4, $5, $6, true, true)
                `, [
                    newCustId, addr1, addr2, city, state, pincode
                ]);
            }

            inserted++;
            if (inserted % 100 === 0) console.log(`Imported ${inserted}...`);
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully imported ${inserted} customers with addresses.`);
        process.exit(0);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error during import:', e);
        process.exit(1);
    } finally {
        client.release();
    }
}

importCombined();
