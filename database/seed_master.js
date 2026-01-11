const { pool } = require('../config/db');

async function seed() {
    try {
        console.log('Seeding Master Data...');

        // 1. Taxes
        const taxes = [
            { name: 'GST 5%', percent: 5, type: 'GST' },
            { name: 'GST 12%', percent: 12, type: 'GST' },
            { name: 'GST 18%', percent: 18, type: 'GST' },
            { name: 'GST 28%', percent: 28, type: 'GST' },
            { name: 'Exempt', percent: 0, type: 'Exempt' }
        ];

        for (const t of taxes) {
            await pool.query(`
                INSERT INTO taxes (tax_name, tax_percentage, tax_type, is_active)
                VALUES ($1, $2, $3, true)
                ON CONFLICT DO NOTHING
            `, [t.name, t.percent, t.type]);
        }
        console.log('Taxes seeded.');

        // 2. Categories
        // CODES must be short (3-4 chars) for our AUTO-CODE logic
        const categories = [
            { name: 'Electronics', code: 'ELE' },
            { name: 'Furniture', code: 'FUR' },
            { name: 'Groceries', code: 'GRO' },
            { name: 'Apparel', code: 'APP' },
            { name: 'General', code: 'GEN' }
        ];

        for (const c of categories) {
            await pool.query(`
                INSERT INTO categories (category_name, category_code, is_active)
                VALUES ($1, $2, true)
                ON CONFLICT DO NOTHING
            `, [c.name, c.code]);
        }
        console.log('Categories seeded.');

        // 3. Brands
        const brands = [
            { name: 'Samsung', code: 'SAM' },
            { name: 'Apple', code: 'APP' },
            { name: 'Ikea', code: 'IKE' },
            { name: 'Nike', code: 'NIK' },
            { name: 'Generic', code: 'GEN' }
        ];

        for (const b of brands) {
            await pool.query(`
                INSERT INTO brands (brand_name, brand_code, is_active)
                VALUES ($1, $2, true)
                ON CONFLICT DO NOTHING
            `, [b.name, b.code]);
        }
        console.log('Brands seeded.');

        // 4. HSN Codes
        // Need to link to tax IDs? For now, we seed basic 
        // Note: HSN usually linked to Tax, but our schema separation supports flexible mapping
        // We will fetch Tax ID for 18% to link default
        const taxRes = await pool.query("SELECT id FROM taxes WHERE tax_percentage = 18 LIMIT 1");
        const tax18Id = taxRes.rows.length ? taxRes.rows[0].id : null;

        const hsn = [
            { code: '8517', desc: 'Smarphones' },
            { code: '8471', desc: 'Laptops' },
            { code: '9403', desc: 'Furniture' },
            { code: '6203', desc: 'Apparel' }
        ];

        for (const h of hsn) {
            await pool.query(`
                INSERT INTO hsn_codes (hsn_code, hsn_description, tax_id, is_active)
                VALUES ($1, $2, $3, true)
                ON CONFLICT DO NOTHING
            `, [h.code, h.desc, tax18Id]);
        }
        console.log('HSN seeded.');

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
