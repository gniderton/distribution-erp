const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

async function importVendors() {
    const file = path.join(TABLES_DIR, 'vendors.json');
    if (!fs.existsSync(file)) return console.log('vendors.json not found');

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Importing ${data.length} vendors...`);

    for (const row of data) {
        try {
            await pool.query(
                `INSERT INTO vendors (id, vendor_code, vendor_name, contact_person, contact_no, contact_no_2, email, gst, branch_id, is_active, vendor_address_id)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
                [
                    parseInt(row.id),
                    row.vendor_code,
                    row.vendor_name,
                    row.contact_person,
                    row.contact_no,
                    row.contact_no_2,
                    row.email || null, // Convert empty string to NULL to satisfy CHECK (email ~* ...)
                    row.gst,
                    row.branch_id,
                    row.is_active,
                    row.vendor_address_id
                ]
            );
        } catch (err) {
            console.error(`Failed to insert vendor ${row.id}:`, err.message);
        }
    }

    // Fix sequence
    await pool.query("SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM vendors))");
    console.log('Vendors imported.');
}

async function importAddresses() {
    const file = path.join(TABLES_DIR, 'vendor_addresses.json');
    if (!fs.existsSync(file)) return console.log('vendor_addresses.json not found');

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Importing ${data.length} addresses...`);

    for (const row of data) {
        try {
            await pool.query(
                `INSERT INTO vendor_addresses (id, vendor_id, address_type_id, address_line, coordinates, area, pin_code, city, district, state_code, is_default, is_active)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
                [
                    parseInt(row.id),
                    row.vendor_id,
                    row.address_type_id,
                    row.Addres_Line,
                    row.Cordinates || null,
                    row.Area || null,
                    row.Pin_Code,
                    row.City || null,
                    row.District,
                    row.State, // kept as text
                    row.is_default,
                    row.is_active
                ]
            );
        } catch (err) {
            console.error(`Failed to insert address ${row.id}:`, err.message);
        }
    }

    // Fix sequence
    await pool.query("SELECT setval('vendor_addresses_id_seq', (SELECT MAX(id) FROM vendor_addresses))");
    console.log('Vendor Addresses imported.');
}

async function run() {
    try {
        await importVendors();
        // Logic: Import addresses AFTER vendors because addresses FK to vendors
        await importAddresses();
    } catch (err) {
        console.error('JSON Import Error:', err);
    } finally {
        pool.end();
    }
}

run();
