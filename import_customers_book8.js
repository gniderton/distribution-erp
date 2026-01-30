const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function importCustomers() {
    const filePath = path.join(__dirname, 'Book8.csv');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(l => l.trim());

    // Headers: customer_name,customer_phone,email,gstin,pan,credit_limit,credit_days,route_id,dse_id,is_active,channel_id,customer_code,route_type_id
    // Index:   0             1             2     3     4    5           6            7        8      9         10         11            12

    let success = 0;
    let failed = 0;

    const client = await pool.connect();

    try {
        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i];
            const cols = line.split(',');

            if (cols.length < 12) continue;

            const name = cols[0].trim();
            let phone = cols[1].trim();
            let email = cols[2].trim();
            const gstin = cols[3].trim();
            const pan = cols[4].trim();
            const credit_limit = parseFloat(cols[5]) || 0;
            const credit_days = parseInt(cols[6]) || 0;
            let route_id = parseInt(cols[7]) || null;
            let dse_id = parseInt(cols[8]) || null;

            // is_active might be "TRUE" string or nothing
            let is_active = true;
            if (cols[9] && cols[9].trim().toUpperCase() === 'FALSE') is_active = false;

            const channel_id = parseInt(cols[10]) || null;
            const code = cols[11].trim();
            const route_type_id = parseInt(cols[12]) || null;

            // Cleanup Phone
            if (phone.toUpperCase().includes('E+')) {
                phone = Number(phone).toLocaleString('fullwide', { useGrouping: false });
            }
            if (!phone || phone === '0') phone = null;

            // Cleanup Email
            if (!email || email === '0') email = null;

            // Cleanup GSTIN/PAN
            let finalGstin = (gstin === '0') ? null : gstin;
            let finalPan = (pan === '0') ? null : pan;

            // Prepare Query
            const insertQuery = `
                INSERT INTO customers (
                    customer_name, customer_phone, email, gstin, pan,
                    credit_limit, credit_days, route_id, dse_id, is_active,
                    channel_id, customer_code, route_type_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (customer_code) DO NOTHING
            `;

            const params = [
                name, phone, email, finalGstin, finalPan,
                credit_limit, credit_days, route_id, dse_id, is_active,
                channel_id, code, route_type_id
            ];

            try {
                // Try Insert with Links
                await client.query(insertQuery, params);
                success++;
            } catch (err) {
                // FK Violation Code: 23503
                if (err.code === '23503') {
                    // Retry with NULL DSE and NULL Route (one of them is likely the culprit)
                    // console.warn(`Row ${i} FK Error (${name}). Retrying unlinked...`);
                    try {
                        const newParams = [...params];
                        newParams[7] = null; // route_id
                        newParams[8] = null; // dse_id

                        await client.query(insertQuery, newParams);
                        success++;
                        // console.log(`-> Recovered Row ${i}`);
                    } catch (retryErr) {
                        console.error(`Row ${i} Fatal Error:`, retryErr.message);
                        failed++;
                    }
                } else {
                    console.error(`Row ${i} Error (${name}):`, err.message);
                    failed++;
                }
            }
        }
    } finally {
        console.log(`Import Complete: ${success} Inserted, ${failed} Failed.`);
        client.release();
        process.exit();
    }
}

importCustomers();
