const { pool } = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Bulk Data Generation...');
        await client.query('BEGIN');

        // 1. Ensure Schema (Self-Healing)
        // Check if default_price_tier exists
        const colRes = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'default_price_tier'
        `);
        if (colRes.rows.length === 0) {
            console.log('⚠️ Column default_price_tier missing. Adding it...');
            await client.query(`ALTER TABLE customers ADD COLUMN default_price_tier text default 'Dealer'`);
        }

        // 2. Create Customers (5 Dealer, 5 Wholesale)
        console.log('👤 Creating Customers...');
        const customerIds = [];

        // 5 Dealers
        for (let i = 1; i <= 5; i++) {
            const res = await client.query(`
                INSERT INTO customers (customer_name, default_price_tier, route_id, is_active)
                VALUES ($1, 'Dealer', 1, true) RETURNING id
            `, [`Test Dealer ${i}`]);
            customerIds.push({ id: res.rows[0].id, type: 'Dealer' });
        }
        // 5 Wholesalers
        for (let i = 1; i <= 5; i++) {
            const res = await client.query(`
                INSERT INTO customers (customer_name, default_price_tier, route_id, is_active)
                VALUES ($1, 'Wholesale', 1, true) RETURNING id
            `, [`Test Wholesale ${i}`]);
            customerIds.push({ id: res.rows[0].id, type: 'Wholesale' });
        }

        // 3. Identify Stocked Products
        console.log('📦 Identifying Stocked Products...');
        const stockRes = await client.query(`
            SELECT product_id, sum(quantity_remaining) as total_stock 
            FROM inventory_batches 
            WHERE quantity_remaining > 50 
            GROUP BY product_id 
            LIMIT 10
        `);

        if (stockRes.rows.length < 5) {
            throw new Error('Not enough stocked products! Please run valid stock injection first.');
        }

        const products = stockRes.rows.map(r => r.product_id);
        const schemeProduct = products[0]; // Logic: Use first product for scheme

        // 4. Create Scheme (Buy 5 Get 1) - One for Dealer, One for Wholesale
        console.log('🎁 Creating Schemes...');

        // Scheme 1: Dealer specific
        const s1 = await client.query(`
            INSERT INTO schemes (scheme_name, start_date, is_active)
            VALUES ('Bulk Test Dealer Scheme', CURRENT_DATE, true) RETURNING id
        `);
        await client.query(`
            INSERT INTO scheme_rules (scheme_id, trigger_type, trigger_id, min_qty, reward_product_id, reward_qty, is_recursive, channel_tier)
            VALUES ($1, 'Product', $2, 5, $2, 1, true, 'Dealer')
        `, [s1.rows[0].id, schemeProduct]);

        // Scheme 2: Wholesale specific (Buy 10 Get 2)
        const s2 = await client.query(`
            INSERT INTO schemes (scheme_name, start_date, is_active)
            VALUES ('Bulk Test Wholesale Scheme', CURRENT_DATE, true) RETURNING id
        `);
        await client.query(`
            INSERT INTO scheme_rules (scheme_id, trigger_type, trigger_id, min_qty, reward_product_id, reward_qty, is_recursive, channel_tier)
            VALUES ($1, 'Product', $2, 10, $2, 2, true, 'Wholesale')
        `, [s2.rows[0].id, schemeProduct]);

        // 5. Generate 10 Sales Orders
        console.log('📝 Generating 10 Sales Orders...');

        for (let i = 0; i < 10; i++) {
            const cust = customerIds[i % 10]; // Cycle through customers

            // Create Header
            const soRes = await client.query(`
                INSERT INTO sales_orders (so_number, customer_id, order_date, total_amount, status)
                VALUES ($1, $2, CURRENT_DATE, 0, 'Confirmed') RETURNING id
            `, [`SO-BULK-V2-${Date.now()}-${i}`, cust.id]);
            const soId = soRes.rows[0].id;

            // Add 10 Items
            let totalAmt = 0;
            for (const pid of products) {
                const qty = 12; // Enough to trigger scheme (5 or 10)
                const rate = 100;

                await client.query(`
                    INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, amount)
                    VALUES ($1, $2, $3, $4, $5)
                `, [soId, pid, qty, rate, (qty * rate)]);

                totalAmt += (qty * rate);
            }

            // Update Total
            await client.query('UPDATE sales_orders SET total_amount = $1 WHERE id = $2', [totalAmt, soId]);
        }

        await client.query('COMMIT');
        console.log('✅ Success! Created 10 Customers, 2 Schemes, 10 Orders.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
