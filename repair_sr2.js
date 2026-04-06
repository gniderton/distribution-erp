const { pool } = require('./config/db');

async function repairSR2() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Repairing Credit Note SR ID 2...");

        // 1. Find the correct unit_net from the repaired Invoice 12
        const invRes = await client.query(`
            SELECT (taxable_amount / NULLIF(shipped_qty, 0)) as unit_net
            FROM sales_invoice_lines
            WHERE invoice_id = 12 AND product_id = 81 AND batch_id = 54
        `);

        if (invRes.rows.length === 0) throw new Error("Could not find source Invoice line (12/81/54)");
        const unitNet = Number(invRes.rows[0].unit_net);
        console.log(`Found Unit Net from Invoice 12: ${unitNet}`);

        // 2. Fetch the current SR line
        const srLineRes = await client.query(`
            SELECT * FROM sales_return_lines WHERE return_id = 2 AND product_id = 81
        `);
        if (srLineRes.rows.length === 0) throw new Error("Could not find SR Line for SR 2 / Prod 81");
        const line = srLineRes.rows[0];

        // 3. Recalculate
        const qty = Number(line.qty);
        const grossRate = Number(line.rate);
        const taxPct = Number(line.tax_percent);

        const newTaxable = qty * unitNet; // 15 * 6.666 = 100.00
        const newScheme = (qty * grossRate) - newTaxable; // (15 * 10.17) - 100 = 52.55
        const newTax = newTaxable * (taxPct / 100); // 100 * 0.18 = 18.00
        const newTotal = newTaxable + newTax; // 118.00

        console.log(`Updating Line: Taxable ${newTaxable}, Scheme ${newScheme}, Total ${newTotal}`);

        // 4. Update the Line
        await client.query(`
            UPDATE sales_return_lines 
            SET scheme_amount = $1, taxable_amount = $2, tax_amount = $3, amount = $4
            WHERE id = $5
        `, [newScheme, newTaxable, newTax, newTotal, line.id]);

        // 5. Update the Header
        await client.query(`
            UPDATE sales_returns
            SET total_taxable = $1, total_tax = $2, grand_total = $3
            WHERE id = 2
        `, [newTaxable, newTax, newTotal]);

        await client.query('COMMIT');
        console.log("✅ SR ID 2 Repaired Successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

repairSR2();
