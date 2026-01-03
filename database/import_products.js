const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

async function importProducts() {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-products'));
    if (!file) return console.log('Products CSV not found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing ${rows.length} products...`);

                    for (const row of rows) {
                        try {
                            // Logic: Insert directly. FKs (brand_id, etc.) assumed to exist from previous step.
                            // Note: Using OVERRIDING SYSTEM VALUE to preserve original CSV IDs
                            // Map empty strings to NULL for optional fields

                            await pool.query(
                                `INSERT INTO products (
                  id, vendor_id, brand_id, category_id, 
                  product_code, product_name, ean_code, hsn_id, 
                  mrp, tax_id, purchase_rate, distributor_rate, 
                  wholesale_rate, dealer_rate, retail_rate
                )
                OVERRIDING SYSTEM VALUE
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (id) DO NOTHING`,
                                [
                                    parseInt(row.id),
                                    parseInt(row.vendor_id),
                                    row.brand_id ? parseInt(row.brand_id) : null,
                                    row.category_id ? parseInt(row.category_id) : null,
                                    row.product_code,
                                    row.product_name,
                                    row.ean_code || null,
                                    row.hsn_id ? parseInt(row.hsn_id) : null,
                                    parseFloat(row.mrp || 0),
                                    row.tax_id ? parseInt(row.tax_id) : null,
                                    parseFloat(row.purchase_rate || 0),
                                    parseFloat(row.distributor_rate || 0),
                                    parseFloat(row.wholesale_rate || 0),
                                    parseFloat(row.dealer_rate || 0),
                                    parseFloat(row.retail_rate || 0),
                                ]
                            );
                        } catch (err) {
                            console.error(`Failed to insert product ${row.id}: ${err.message}`);
                        }
                    }

                    // Fix sequence
                    await pool.query("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))");

                    console.log('Products imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function run() {
    try {
        await importProducts();
    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        pool.end();
    }
}

run();
