const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

// Helper to read CSV
const readCSV = (fileNamePattern) => {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith(fileNamePattern));
    if (!file) {
        console.log(`❌ No file found for pattern: ${fileNamePattern}`);
        return null;
    }
    console.log(`📂 Found file: ${file}`);
    const rows = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
};

async function cleanMasterImport() {
    try {
        console.log('🚀 Starting Clean Master Import...');

        // 1. Truncate All Master Tables (Cascade to clear products first)
        console.log('🗑️  Truncating old data (Products, HSN, Tax, Brands, Categories)...');
        await pool.query('TRUNCATE TABLE products, hsn_codes, taxes, brands, categories RESTART IDENTITY CASCADE');

        // 2. Import Independent Tables (Brand, Category, Tax)

        // --- BRANDS ---
        const brands = await readCSV('dbo-brand');
        if (brands) {
            console.log(`📥 Importing ${brands.length} Brands...`);
            for (const row of brands) {
                await pool.query(
                    `INSERT INTO brands (id, brand_code, brand_name, is_active)
                     OVERRIDING SYSTEM VALUE
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.Brand_Code, row.Brand, row.is_active === '1']
                );
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('brands', 'id'), (SELECT MAX(id) FROM brands))`);
        }

        // --- CATEGORIES ---
        const categories = await readCSV('dbo-category');
        if (categories) {
            console.log(`📥 Importing ${categories.length} Categories...`);
            for (const row of categories) {
                await pool.query(
                    `INSERT INTO categories (id, category_code, category_name, is_active)
                     OVERRIDING SYSTEM VALUE
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.Category_Code || null, row.Category_Name, row.is_active === '1']
                );
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories))`);
        }

        // --- TAXES ---
        const taxes = await readCSV('dbo-tax');
        if (taxes) {
            console.log(`📥 Importing ${taxes.length} Taxes...`);
            for (const row of taxes) {
                await pool.query(
                    `INSERT INTO taxes (id, tax_percentage, tax_type, tax_name, valid_from, is_active)
                     OVERRIDING SYSTEM VALUE
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.Tax_Percentage, row.Tax_Type, row.Tax_Name, row.Valid_from || null, row.is_active === '1']
                );
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('taxes', 'id'), (SELECT MAX(id) FROM taxes))`);
        }

        // 3. Import Dependent Tables (HSN depends on Tax)

        // --- HSN CODES ---
        const hsn = await readCSV('dbo-hsn');
        if (hsn) {
            console.log(`📥 Importing ${hsn.length} HSN Codes...`);
            for (const row of hsn) {
                await pool.query(
                    `INSERT INTO hsn_codes (id, hsn_code, hsn_description, tax_id, is_active)
                     OVERRIDING SYSTEM VALUE
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (hsn_code) DO NOTHING`,
                    [row.id, row.HSN_Code, row.HSN_Description, row.tax_id || null, row.is_active === '1']
                );
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('hsn_codes', 'id'), (SELECT MAX(id) FROM hsn_codes))`);
        }

        // 4. Import Products (Depends on everything)
        const products = await readCSV('dbo-products');
        if (products) {
            console.log(`📥 Importing ${products.length} Products...`);
            for (const row of products) {
                // Ensure numerics are clean
                await pool.query(
                    `INSERT INTO products (
                       id, vendor_id, brand_id, category_id, 
                       product_code, product_name, ean_code, hsn_id, 
                       mrp, tax_id, purchase_rate, distributor_rate, 
                       wholesale_rate, dealer_rate, retail_rate
                     )
                     OVERRIDING SYSTEM VALUE
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                     ON CONFLICT (product_code) DO NOTHING`,
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
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products))`);
        }

        console.log('✅ All Master Data Cleaned & Imported.');

    } catch (err) {
        console.error('❌ Import Error:', err);
    } finally {
        pool.end();
    }
}

cleanMasterImport();
