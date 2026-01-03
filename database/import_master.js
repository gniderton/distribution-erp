const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

async function importTaxes() {
    // File pattern: dbo-tax...
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-tax'));
    if (!file) return console.log('No Tax file found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing ${rows.length} taxes...`);
                    for (const row of rows) {
                        // Map CSV columns to DB columns
                        await pool.query(
                            `INSERT INTO taxes (tax_percentage, tax_type, tax_name, valid_from, is_active)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`, // Prevent dupes on re-run
                            [row.Tax_Percentage, row.Tax_Type, row.Tax_Name, row.Valid_from || null, row.is_active === '1']
                        );
                    }
                    console.log('Taxes imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function importHSN() {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-hsn'));
    if (!file) return console.log('No HSN file found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing ${rows.length} HSN codes...`);
                    for (const row of rows) {
                        // Logic: Make sure tax_id exists or handle it? Assuming IDs map 1:1 if we preserve ID? 
                        // Better: Look up tax or just insert. For now, basic insert.
                        await pool.query(
                            `INSERT INTO hsn_codes (hsn_code, hsn_description, tax_id, is_active)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (hsn_code) DO NOTHING`,
                            [row.HSN_Code, row.HSN_Description, row.tax_id || null, row.is_active === '1']
                        );
                    }
                    console.log('HSN codes imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function importBrands() {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-brand'));
    if (!file) return console.log('No Brand file found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing ${rows.length} Brands...`);
                    for (const row of rows) {
                        await pool.query(
                            `INSERT INTO brands (brand_code, brand_name, is_active)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
                            [row.Brand_Code, row.Brand, row.is_active === '1']
                        );
                    }
                    console.log('Brands imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function importCategories() {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-category'));
    if (!file) return console.log('No Category file found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing ${rows.length} Categories...`);
                    for (const row of rows) {
                        await pool.query(
                            `INSERT INTO categories (category_code, category_name, is_active)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
                            [row.Category_Code || null, row.Category_Name, row.is_active === '1']
                        );
                    }
                    console.log('Categories imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function run() {
    try {
        await importTaxes();
        await importHSN();
        await importBrands();
        await importCategories();
        console.log('--- Master Data Import Complete ---');
    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        pool.end();
    }
}

run();
