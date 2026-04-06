const { pool } = require('./config/db');

async function testGrouping() {
    try {
        // We'll simulate the logic for Invoice 12
        const id = 12;

        const query = `
            SELECT 
                si.id as invoice_id,
                (
                    SELECT json_agg(
                        json_build_object(
                            'product_id', il.product_id,
                            'batch_code', ib.batch_code,
                            'shipped_qty', il.shipped_qty,
                            'mrp', il.mrp,
                            'amount', il.amount
                        )
                    )
                    FROM sales_invoice_lines il
                    LEFT JOIN inventory_batches ib ON il.batch_id = ib.id
                    WHERE il.invoice_id = si.id
                ) as invoice_lines
            FROM sales_invoices si
            WHERE si.id = $1
        `;

        const result = await pool.query(query, [id]);
        const data = result.rows[0];

        console.log("--- Raw Data from SQL ---");
        console.table(data.invoice_lines);

        // Mock the logic from the route
        if (data.invoice_lines && Array.isArray(data.invoice_lines)) {
            const grouped = {};
            data.invoice_lines.forEach(line => {
                const key = `${line.product_id}_${line.mrp}`;
                if (!grouped[key]) {
                    grouped[key] = { ...line, contributors: [{ batch_code: line.batch_code, qty: Number(line.shipped_qty) }] };
                } else {
                    grouped[key].shipped_qty = Number(grouped[key].shipped_qty) + Number(line.shipped_qty);
                    grouped[key].amount = Number(grouped[key].amount) + Number(line.amount);
                    grouped[key].contributors.push({ batch_code: line.batch_code, qty: Number(line.shipped_qty) });
                }
            });

            const finalLines = Object.values(grouped).map(g => {
                const winner = g.contributors.reduce((max, curr) => curr.qty > max.qty ? curr : max, g.contributors[0]);
                return { ...g, batch_code: winner.batch_code, contributors: undefined };
            });

            console.log("\n--- Grouped Data (Expected in response) ---");
            console.table(finalLines);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testGrouping();
