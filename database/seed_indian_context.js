const { pool } = require('../config/db');

async function seed() {
    try {
        console.log('Seeding Indian Context Data...');

        // 1. Taxes (Including Exempt)
        const taxes = [
            { name: 'GST at 5%', percent: 5, type: 'GST' },
            { name: 'GST at 12%', percent: 12, type: 'GST' },
            { name: 'GST at 18%', percent: 18, type: 'GST' },
            { name: 'GST at 28%', percent: 28, type: 'GST' },
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
        const categories = [
            { name: 'Biscuits', code: 'BIS' },
            { name: 'Chocolates', code: 'CHO' },
            { name: 'Beverages', code: 'BEV' },
            { name: 'Personal Care', code: 'PER' }
        ];

        for (const c of categories) {
            await pool.query(`
                INSERT INTO categories (category_name, category_code, is_active)
                VALUES ($1, $2, true)
                ON CONFLICT DO NOTHING
            `, [c.name, c.code]);
        }
        console.log('Categories seeded.');

        // 3. Brands (FMCG Focus)
        const brands = [
            { name: 'Mc Vities', code: 'MCV' },
            { name: 'Britania', code: 'BRI' },
            { name: 'Parle', code: 'PAR' },
            { name: 'Sunfeast', code: 'SUN' },
            { name: 'Cadbury', code: 'CAD' }
        ];

        for (const b of brands) {
            await pool.query(`
                INSERT INTO brands (brand_name, brand_code, is_active)
                VALUES ($1, $2, true)
                ON CONFLICT (brand_code) DO NOTHING
            `, [b.name, b.code]);
        }
        console.log('Brands seeded.');

        // 4. HSN Codes
        // Get Tax ID for 18% and 5%
        const tax18Res = await pool.query("SELECT id FROM taxes WHERE tax_percentage = 18 LIMIT 1");
        const tax18Id = tax18Res.rows[0]?.id;

        const tax5Res = await pool.query("SELECT id FROM taxes WHERE tax_percentage = 5 LIMIT 1");
        const tax5Id = tax5Res.rows[0]?.id;

        const hsn = [
            { code: '19053100', desc: 'Biscuits (Sweet)', tax_id: tax18Id },
            { code: '18063100', desc: 'Chocolate', tax_id: tax18Id },
            { code: '2106', desc: 'Edible Preparations', tax_id: tax5Id }
        ];

        for (const h of hsn) {
            await pool.query(`
                INSERT INTO hsn_codes (hsn_code, hsn_description, tax_id, is_active)
                VALUES ($1, $2, $3, true)
                 ON CONFLICT (hsn_code) DO NOTHING
            `, [h.code, h.desc, h.tax_id]);
        }
        console.log('HSN seeded.');

        // 5. Vendor (With Address)
        const v = {
            name: 'Some More Foods Private Limited',
            code: 'V001',
            email: 'sales@somemorefoods.com',
            phone: '9876543210',
            gst: '29ABCDE1234F1Z5',
            terms: 30,
            address: '123, Industrial Area, Peenya, Bangalore',
            state: 'Karnataka',
            pan: 'ABCDE1234F',
            bank_name: 'HDFC Bank',
            bank_acc: '50100200300400',
            bank_ifsc: 'HDFC0001234'
        };

        const vendorRes = await pool.query(`
            INSERT INTO vendors (
                vendor_name, vendor_code, email, contact_no, gst, 
                address_line1, state, pan, bank_name, bank_account_no, bank_ifsc, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            ON CONFLICT (vendor_code) DO UPDATE SET vendor_name = EXCLUDED.vendor_name
            RETURNING id
        `, [v.name, v.code, v.email, v.phone, v.gst, v.address, v.state, v.pan, v.bank_name, v.bank_acc, v.bank_ifsc]);

        const vendorId = vendorRes.rows[0].id;

        // Also seed into proper address table
        await pool.query(`
            INSERT INTO vendor_addresses (vendor_id, address_line, state_code, is_default, is_active)
            VALUES ($1, $2, $3, true, true)
        `, [vendorId, v.address, v.state]);

        console.log('Vendor seeded.');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
