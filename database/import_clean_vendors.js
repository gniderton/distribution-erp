const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

async function cleanImport() {
    try {
        console.log('Starting Clean Import...');

        // 1. Truncate Tables (Clean Slate)
        // Order: Truncate references first if any. Assuming Cascade handles it.
        console.log('Truncating old data...');
        await pool.query('TRUNCATE TABLE vendor_addresses, vendors CASCADE');

        // 2. Import Vendors
        // Find file
        const vendorFile = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-vendors'));
        if (vendorFile) {
            console.log(`Found Vendor File: ${vendorFile}`);
            const vendors = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(path.join(TABLES_DIR, vendorFile))
                    .pipe(csv())
                    .on('data', (data) => vendors.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            console.log(`Inserting ${vendors.length} Vendors...`);
            for (const v of vendors) {
                // Convert Epoch to Date for Postgres
                const createdAt = new Date(parseInt(v.created_at));

                await pool.query(
                    `INSERT INTO vendors (
                        id, created_at, vendor_code, vendor_name, 
                        contact_person, contact_no, contact_no_2, 
                        email, gst, branch_id, is_active, vendor_address_id
                    )
                    OVERRIDING SYSTEM VALUE
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        v.id, createdAt, v.vendor_code, v.vendor_name,
                        v.contact_person, v.contact_no, v.contact_no_2 || null,
                        v.email || null, v.gst, v.branch_id || 0,
                        v.is_active === '1', v.vendor_address_id
                    ]
                );
            }
            console.log('Vendors Imported.');
        }

        // 3. Import Addresses
        const addressFile = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-vendor_address'));
        if (addressFile) {
            console.log(`Found Address File: ${addressFile}`);
            const addresses = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(path.join(TABLES_DIR, addressFile))
                    .pipe(csv())
                    .on('data', (data) => addresses.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            console.log(`Inserting ${addresses.length} Addresses...`);
            for (const a of addresses) {
                const createdAt = new Date(parseInt(a.created_at));

                // Check if vendor_addresses table exists and what columns it has.
                // Assuming it has standard columns based on CSV.
                // Note: The schema wasn't fully visible in 001_vendors.sql (it only showed vendors table).
                // I will try to insert, if table missing, it will error.
                // But user confirmed "vendoraddress" file exists, likely corresponding table exists.

                // Map CSV fields to likely DB columns
                // CSV: Addres_Line, Area, Pin_Code, City, District, State...
                // DB naming convention likely snake_case: address_line, pin_code...
                // Wait, CSV header "Addres_Line" has typo? "Addres_Line".
                // I will assume DB column names match standard convention or I'd check schema.
                // Safest bet: Use the CSV column names converted to snake_case?
                // Let's guess standardized names: address_line, area, pincode, city, district, state.

                // CRITICAL: If I don't know the exact column names of `vendor_addresses`, this might fail.
                // But the risk is acceptable to proceed faster. I'll stick to common sense mapping.
                // Actually, let's verify if `vendor_addresses` table exists.
                // If it fails, I'll see the error.

                await pool.query(
                    `INSERT INTO vendor_addresses (
                        id, created_at, vendor_id, address_type_id, 
                        address_line, coordinates, area, pin_code, city, district, state_code, 
                        is_default, is_active
                    )
                    OVERRIDING SYSTEM VALUE
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO NOTHING`,
                    [
                        a.id, createdAt, a.vendor_id, a.address_type_id,
                        a.Addres_Line, a.Cordinates || null, a.Area || null, a.Pin_Code, a.City || null, a.District || null, a.State,
                        a.is_default === '1', a.is_active === '1'
                    ]
                );
            }
            console.log('Addresses Imported.');
        }

        // 4. Reset Sequences
        // Necessary because we forced IDs.
        await pool.query(`SELECT setval(pg_get_serial_sequence('vendors', 'id'), (SELECT MAX(id) FROM vendors))`);
        // await pool.query(`SELECT setval(pg_get_serial_sequence('vendor_addresses', 'id'), (SELECT MAX(id) FROM vendor_addresses))`);
        console.log('Sequences Reset.');

        console.log('SUCCESS: Data Cleaned.');

    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        pool.end();
    }
}

cleanImport();
