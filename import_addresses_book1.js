const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function importAddresses() {
    const filePath = path.join(__dirname, 'Book1.csv');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    // Read Addresses (Book1)
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const addressLines = fileContent.split('\n').filter(l => l.trim());
    // Remove Header
    addressLines.shift();

    console.log(`Found ${addressLines.length} addresses.`);

    const client = await pool.connect();

    try {
        // Fetch All Customers Ordered by Creation/ID (Assuming sequential import from Book8)
        const custRes = await client.query('SELECT id, customer_name FROM customers ORDER BY id ASC');
        const customers = custRes.rows;

        console.log(`Found ${customers.length} customers in DB.`);

        if (customers.length !== addressLines.length) {
            console.warn(`WARNING: Count mismatch! Customers: ${customers.length}, Addresses: ${addressLines.length}. Mapping might be off.`);
            // Proceed anyway, stopping at min length
        }

        let success = 0;
        let failed = 0;

        const limit = Math.min(customers.length, addressLines.length);

        // Regular Expression for CSV splitting (handling pointers/commas inside quotes)
        // Simple split won't work for: "7RC2+W44, Thondayad, Kozhikode..."
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        for (let i = 0; i < limit; i++) {
            const cust = customers[i];
            const line = addressLines[i];

            // Split by comma ignoring commas inside quotes
            const cols = line.split(regex).map(s => s.trim().replace(/^"|"$/g, ''));

            // Cols: id, addr1, addr2, city, state, pin, billing, shipping
            // Index: 0, 1,     2,     3,    4,     5,   6,       7

            const addr1 = cols[1];
            const addr2 = cols[2];
            const city = cols[3];
            const state = cols[4] || 'Kerala';
            const pincode = cols[5];
            const is_bill = cols[6] === 'TRUE';
            const is_ship = cols[7] === 'TRUE';

            try {
                await client.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, address_line2, city, state, pincode,
                        is_default_billing, is_default_shipping
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    cust.id,
                    addr1,
                    addr2 || null,
                    city || null,
                    state,
                    pincode || null,
                    is_bill,
                    is_ship
                ]);
                success++;
            } catch (err) {
                console.error(`Row ${i} Error (Cust: ${cust.customer_name}):`, err.message);
                failed++;
            }
        }

        console.log(`Import Complete. Linked ${success} Addresses.`);

    } finally {
        client.release();
        process.exit();
    }
}

importAddresses();
