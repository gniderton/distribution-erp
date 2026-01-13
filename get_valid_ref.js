const { pool } = require('./config/db');

async function getRefData() {
    try {
        const brand = await pool.query('SELECT brand_name FROM brands ORDER BY id LIMIT 1');
        const cat = await pool.query('SELECT category_name FROM categories ORDER BY id LIMIT 1');
        const tax = await pool.query('SELECT tax_name FROM taxes ORDER BY id LIMIT 1');
        const hsn = await pool.query('SELECT hsn_code FROM hsn_codes ORDER BY id LIMIT 1');
        const vendor = await pool.query('SELECT vendor_name FROM vendors ORDER BY id LIMIT 1');

        console.log("JSON_OUTPUT_START");
        console.log(JSON.stringify({
            brand: brand.rows[0]?.brand_name || 'Generic Brand',
            category: cat.rows[0]?.category_name || 'Generic Category',
            tax: tax.rows[0]?.tax_name || 'GST 18%',
            hsn: hsn.rows[0]?.hsn_code || '1234',
            vendor: vendor.rows[0]?.vendor_name || 'Generic Vendor'
        }));
        console.log("JSON_OUTPUT_END");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

getRefData();
