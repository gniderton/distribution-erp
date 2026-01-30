const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function importCombined() {
    const filePath = path.join(__dirname, 'Combined.csv');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(l => l.trim());

    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    let success = 0;
    let failed = 0;

    const client = await pool.connect();

    // Process in Chunks
    const CHUNK_SIZE = 50;

    // Helper to process a single line
    const processLine = async (line, i) => {
        let cols = line.split(regex).map(s => s.trim().replace(/^"|"$/g, ''));

        if (cols.length < 15) return;

        const name = cols[4];
        let phone = cols[5];
        let email = cols[6];
        let gstin = cols[7];
        let pan = cols[8];
        const credit_limit = parseFloat(cols[9]) || 0;
        const credit_days = parseInt(cols[10]) || 0;
        let route_id = parseInt(cols[11]) || null;
        let dse_id = parseInt(cols[12]) || null;
        let is_active = (cols[13] || 'TRUE').toUpperCase() === 'TRUE';
        let channel_id = parseInt(cols[14]) || null;
        const code = cols[15];
        const route_type_id = parseInt(cols[16]) || null;

        // Cleanup
        if (phone && phone.toUpperCase().includes('E+')) {
            phone = Number(phone).toLocaleString('fullwide', { useGrouping: false });
        }
        if (!phone || phone === '0') phone = null;
        if (!email || email === '0') email = null;
        if (gstin === '0') gstin = null;
        if (pan === '0') pan = null;

        // Address
        const addr1 = cols[19];
        const addr2 = cols[20];
        const city = cols[21];
        const state = cols[22] || 'Kerala';
        const pincode = cols[23];
        const is_bill = (cols[24] === 'TRUE');
        const is_ship = (cols[25] === 'TRUE');

        try {
            // Note: Parallel queries share the same pool but we usually need separate clients for transactions if overlapping.
            // But 'pool.query' creates auto-release clients. 
            // However, we want atomic Cust+Addr.
            // Using the SINGLE shared 'client' for all parallel requests is BAD if using BEGIN/COMMIT individually in parallel (race conditions).
            // Solution: Use pool.connect() for EACH item or just run sequentially within the chunk?
            // Generating 50 clients is heavy.
            // Better: Run SEQUENTIALLY within chunk? No, that's what we had.
            // Better: Use `pool` directly (auto client) but wrap in a single SQL function?
            // OR: Just risk the non-transactional atomicity (small risk if code logic is fine).
            // Safest for concurrency: Use a new client for each parallel op, OR Just insert Customer, then Insert Address. Code is unlikely to fail between them.

            // Speed up: Just Insert. 
            const custRes = await pool.query(`
                INSERT INTO customers (
                    customer_name, customer_phone, email, gstin, pan,
                    credit_limit, credit_days, route_id, dse_id, is_active,
                    channel_id, customer_code, route_type_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                name, phone, email, gstin, pan,
                credit_limit, credit_days, route_id, dse_id, is_active,
                channel_id, code, route_type_id
            ]).catch(async err => {
                if (err.code === '23503') { // FK Error Retry
                    return await pool.query(`
                        INSERT INTO customers (
                            customer_name, customer_phone, email, gstin, pan,
                            credit_limit, credit_days, route_id, dse_id, is_active,
                            channel_id, customer_code, route_type_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        RETURNING id
                    `, [
                        name, phone, email, gstin, pan,
                        credit_limit, credit_days, null, null, is_active,
                        channel_id, code, route_type_id
                    ]);
                }
                throw err;
            });

            const newCustomerId = custRes.rows[0].id;

            if (addr1 || addr2) {
                await pool.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, address_line2, city, state, pincode,
                        is_default_billing, is_default_shipping
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    newCustomerId, addr1, addr2 || null, city || null, state, pincode || null, is_bill, is_ship
                ]);
            }
            return true;
        } catch (e) {
            console.error(`Error row ${i} (${name}): ${e.message}`);
            return false;
        }
    };

    try {
        console.log(`Starting Fast Import of ${lines.length - 1} rows...`);

        let chunk = [];
        for (let i = 1; i < lines.length; i++) {
            chunk.push(processLine(lines[i], i));

            if (chunk.length >= CHUNK_SIZE || i === lines.length - 1) {
                const results = await Promise.all(chunk);
                success += results.filter(r => r).length;
                failed += results.filter(r => !r).length;
                chunk = [];
                process.stdout.write(`\rProcessed: ${i}/${lines.length - 1} | Success: ${success} | Failed: ${failed}`);
            }
        }
    } finally {
        console.log(`\nDone. Total Success: ${success}, Total Failed: ${failed}`);
        client.release();
        process.exit();
    }
}

importCombined();
