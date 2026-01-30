const { pool } = require('./config/db');

async function generateData() {
    const client = await pool.connect();
    try {
        console.log('--- STARTING DATA GENERATION ---');
        await client.query('BEGIN');

        // 1. Ensure DSE Exists (ID: 48, Code: emp001) for consistency
        const dseRes = await client.query("SELECT id FROM employees WHERE employee_code = 'emp001'");
        let dseId;

        if (dseRes.rows.length === 0) {
            console.log('Creating DSE: emp001');
            const newEmp = await client.query(`
                INSERT INTO employees (
                    employee_code, full_name, designation, contact_primary, email
                ) VALUES ('emp001', 'Rahul Sharma', 'DSE', '9999999999', 'rahul@test.com')
                RETURNING id
            `);
            dseId = newEmp.rows[0].id;
        } else {
            dseId = dseRes.rows[0].id;
            console.log(`DSE emp001 exists (ID: ${dseId})`);
        }

        // 2. Create Routes for All Days (Mon-Sat)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const routeMap = {}; // Day -> RouteID

        for (const day of days) {
            const routeName = `Route ${day}`;
            const rRes = await client.query(`
                INSERT INTO routes (route_name, description)
                VALUES ($1, $2)
                ON CONFLICT (route_name) DO UPDATE SET route_name = EXCLUDED.route_name
                RETURNING id
            `, [routeName, `Standard Route for ${day}`]);
            routeMap[day] = rRes.rows[0].id;
        }
        console.log('Routes Verified/Created.');

        // 3. Create Customers (5 per route)
        let custCount = 0;
        for (const day of days) {
            const routeId = routeMap[day];

            for (let i = 1; i <= 5; i++) {
                const shopName = `${day} Shop ${i}`;
                const phone = `987${days.indexOf(day)}${String(i).padStart(6, '0')}`;

                // Check if customer exists
                const existingCust = await client.query("SELECT id FROM customers WHERE customer_phone = $1", [phone]);
                let custId;

                if (existingCust.rows.length === 0) {
                    const cRes = await client.query(`
                        INSERT INTO customers (
                            customer_name, customer_phone,
                            route_id, dse_id, 
                            credit_limit, credit_days,
                            is_active
                        ) VALUES (
                            $1, $2, 
                            $3, $4,
                            50000, 30,
                            true
                        ) RETURNING id
                    `, [shopName, phone, routeId, dseId]);
                    custId = cRes.rows[0].id;
                } else {
                    custId = existingCust.rows[0].id;
                    await client.query(`
                        UPDATE customers SET 
                            route_id = $1, dse_id = $2
                        WHERE id = $3
                    `, [routeId, dseId, custId]);
                }

                // Upsert Address
                const existingAddr = await client.query("SELECT id FROM customer_addresses WHERE customer_id = $1", [custId]);
                if (existingAddr.rows.length === 0) {
                    await client.query(`
                        INSERT INTO customer_addresses (
                            customer_id, address_line1, city, state, pincode, is_default_billing, is_default_shipping
                        ) VALUES ($1, $2, 'Kochi', 'Kerala', '682001', true, true)
                    `, [custId, `123 ${day} Street`]);
                }

                custCount++;
            }
        }
        console.log(`Ensured ${custCount} Customers across all days.`);

        // 4. Ensure Brands & Categories
        const bRes = await client.query("SELECT id FROM brands WHERE brand_code = 'BRI'");
        let brandId;
        if (bRes.rows.length === 0) {
            const newB = await client.query("INSERT INTO brands (brand_name, brand_code, is_active) VALUES ('Britannia', 'BRI', true) RETURNING id");
            brandId = newB.rows[0].id;
        } else {
            brandId = bRes.rows[0].id;
        }

        const cRes = await client.query("SELECT id FROM categories WHERE category_code = 'BIS'");
        let catId;
        if (cRes.rows.length === 0) {
            const newC = await client.query("INSERT INTO categories (category_name, category_code, is_active) VALUES ('Biscuits', 'BIS', true) RETURNING id");
            catId = newC.rows[0].id;
        } else {
            catId = cRes.rows[0].id;
        }

        // Create 5 Products
        for (let p = 1; p <= 5; p++) {
            const pCode = `BRI-BIS-00${p}`;
            const pCheck = await client.query("SELECT id FROM products WHERE product_code = $1", [pCode]);

            if (pCheck.rows.length === 0) {
                await client.query(`
                    INSERT INTO products (
                        product_name, product_code, brand_id, category_id, vendor_id,
                        mrp, purchase_rate, case_quantity, is_active
                    ) VALUES (
                        $1, $2, $3, $4, 1,
                        20, 15, 48, true
                    )
                `, [`Good Day Pack ${p}`, pCode, brandId, catId]);
            }
        }

        // 5. Create a Simple Scheme
        // Buy 10 Get 1 Free for Product 1
        const p1Res = await client.query("SELECT id FROM products WHERE product_code = 'BRI-BIS-001'");
        if (p1Res.rows.length > 0) {
            const p1Id = p1Res.rows[0].id;
            // Check scheme
            const sRes = await client.query("SELECT id FROM schemes WHERE scheme_name = 'Good Day Promo'");
            let sId;
            if (sRes.rows.length === 0) {
                const newS = await client.query(`INSERT INTO schemes (scheme_name, start_date) VALUES ('Good Day Promo', '2020-01-01') RETURNING id`);
                sId = newS.rows[0].id;
                await client.query(`
                    INSERT INTO scheme_rules (scheme_id, trigger_type, trigger_id, min_qty, reward_qty, reward_product_id)
                    VALUES ($1, 'Product', $2, 10, 1, $2)
                 `, [sId, p1Id]);
                console.log("Created 'Good Day Promo' Scheme");
            }
        }


        await client.query('COMMIT');
        console.log('--- DATA GENERATION COMPLETE ---');
        console.log(`DSE Login: emp001 (ID: ${dseId})`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

generateData();
