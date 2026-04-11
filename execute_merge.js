
const { pool } = require('./config/db');

const merges = [
    { name: 'AL - RAVAJ STORE', survivorId: 572, loserIds: [765] },
    { name: 'Karthika bakery & coolbar', survivorId: 285, loserIds: [234] },
    { name: 'BHARATH EGG MERCHANT', survivorId: 816, loserIds: [815] },
    { name: 'B N Store', survivorId: 655, loserIds: [742] },
    { name: 'FRESHLAND', survivorId: 375, loserIds: [408] },
    { name: 'RP Store', survivorId: 522, loserIds: [523] }
];

async function executeMerge() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Starting merge process...');

        const tablesToUpdate = [
            'sales_invoices',
            'customer_payments',
            'trip_returns',
            'customer_verification_requests',
            'customer_addresses',
            'sales_orders',
            'customer_brand_pricing'
        ];

        for (const m of merges) {
            console.log(`Merging ${m.name} (Survivor: ${m.survivorId}, Losers: ${m.loserIds.join(', ')})`);
            
            for (const loserId of m.loserIds) {
                // 1. Update Referencing Tables
                for (const table of tablesToUpdate) {
                    await client.query(`UPDATE ${table} SET customer_id = $1 WHERE customer_id = $2`, [m.survivorId, loserId]);
                }

                // 2. Translocate Metadata if Survivor has NULLs
                const loserData = await client.query(`SELECT * FROM customers WHERE id = $1`, [loserId]);
                const survivorData = await client.query(`SELECT * FROM customers WHERE id = $1`, [m.survivorId]);

                if (loserData.rows.length > 0 && survivorData.rows.length > 0) {
                    const l = loserData.rows[0];
                    const s = survivorData.rows[0];

                    const updates = [];
                    const params = [m.survivorId];
                    let paramIdx = 2;

                    const fieldsToSync = ['route_id', 'channel_id', 'route_type_id', 'dse_id', 'whatsapp_number', 'credit_limit', 'credit_days', 'customer_phone', 'email', 'gstin', 'pan', 'default_price_tier'];

                    for (const field of fieldsToSync) {
                        if (s[field] === null && l[field] !== null) {
                            updates.push(`${field} = $${paramIdx++}`);
                            params.push(l[field]);
                        }
                    }

                    if (updates.length > 0) {
                        await client.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = $1`, params);
                    }
                }

                // 3. Delete the duplicate record
                await client.query(`DELETE FROM customers WHERE id = $1`, [loserId]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Merge completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Merge failed. Rolling back everything.', err);
    } finally {
        client.release();
        await pool.end();
    }
}

executeMerge();
