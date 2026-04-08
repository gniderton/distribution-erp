const { pool } = require('../config/db');
pool.query("SELECT id, cheque_number, party_id, party_type, amount, updated_at FROM cheques WHERE status = 'BOUNCED' ORDER BY updated_at DESC LIMIT 1")
    .then(async res => {
        if (res.rows.length === 0) {
            console.log("No bounced cheques found.");
            process.exit();
        }
        const cheque = res.rows[0];
        console.table([cheque]);

        // Check for penalty in sales_invoices (Customer Debit Note)
        const siRes = await pool.query("SELECT id, invoice_number, grand_total FROM sales_invoices WHERE invoice_number LIKE 'PEN%'");
        if (siRes.rows.length > 0) {
            console.log("Found Penalty in sales_invoices (Debit Note):");
            console.table(siRes.rows);
        }

        // Check in vendor_penalties
        const vpRes = await pool.query("SELECT id, penalty_number, amount, remarks FROM vendor_penalties WHERE cheque_id = $1", [cheque.id]);
        if (vpRes.rows.length > 0) {
            console.log("Found Penalty in vendor_penalties:");
            console.table(vpRes.rows);
        }

        // Check in income_penalties
        const ipRes = await pool.query("SELECT id, penalty_number, amount, remarks FROM income_penalties WHERE cheque_id = $1", [cheque.id]);
        if (ipRes.rows.length > 0) {
            console.log("Found Penalty in income_penalties:");
            console.table(ipRes.rows);
        }

        // Check in expense_penalties
        const epRes = await pool.query("SELECT id, penalty_number, amount, remarks FROM expense_penalties WHERE cheque_id = $1", [cheque.id]);
        if (epRes.rows.length > 0) {
            console.log("Found Penalty in expense_penalties:");
            console.table(epRes.rows);
        }

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
