const { pool } = require('./config/db');

async function restoreAndPurge() {
    try {
        console.log("--- STARTING EMERGENCY RESTORATION & CORRECTED PURGE ---");

        // 1. RE-SEED Chart of Accounts
        console.log("Seeding Chart of Accounts...");
        await pool.query(`
            INSERT INTO chart_of_accounts (code, name, type) VALUES
            (1001, 'Inventory (Stock)', 'ASSET'),
            (1002, 'Bank Account', 'ASSET'),
            (1003, 'Cash in Hand', 'ASSET'),
            (1010, 'GST Input - IGST', 'ASSET'),
            (1011, 'GST Input - CGST', 'ASSET'),
            (1012, 'GST Input - SGST', 'ASSET'),
            (1101, 'Accounts Receivable', 'ASSET'),
            (2001, 'Accounts Payable', 'LIABILITY'),
            (2010, 'GST Output - IGST', 'LIABILITY'),
            (2011, 'GST Output - CGST', 'LIABILITY'),
            (2012, 'GST Output - SGST', 'LIABILITY'),
            (3001, 'Retained Earnings', 'EQUITY'),
            (4001, 'Sales Revenue', 'INCOME'),
            (4002, 'Discount Received', 'INCOME'),
            (5001, 'Cost of Goods Sold', 'EXPENSE'),
            (5002, 'Inventory Loss', 'EXPENSE')
            ON CONFLICT (code) DO NOTHING;
        `);

        // 2. RE-SEED Document Sequences
        console.log("Seeding Document Sequences...");
        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number) VALUES
            ('PO', 'PO-26-', 0),
            ('PI', 'PI-26-', 0),
            ('SI', 'SI-26-', 0),
            ('DN', 'DN-26-', 0),
            ('PAYMENT', 'PAY-26-', 0)
            ON CONFLICT (document_type) DO NOTHING;
        `);

        // 3. RE-SEED Taxes
        console.log("Seeding Taxes...");
        await pool.query(`
            INSERT INTO taxes (tax_name, tax_percentage, tax_type) VALUES
            ('GST 0%', 0.00, 'GST'),
            ('GST 5%', 5.00, 'GST'),
            ('GST 12%', 12.00, 'GST'),
            ('GST 18%', 18.00, 'GST'),
            ('GST 28%', 28.00, 'GST')
            ON CONFLICT DO NOTHING;
        `);

        // 4. PERFORM THE CORRECTED PURGE
        // We identify all tables and EXCLUDE the verified setup tables.
        const KEEP_LIST = [
            'chart_of_accounts',
            'account_groups',
            'document_sequences',
            'routes',
            'channels',
            'bank_accounts',
            'hsn_codes',
            'taxes',
            'uom_master',
            'uom',
            'designations',
            'departments',
            'roles',
            'permissions'
        ];

        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        const allTables = res.rows.map(r => r.table_name);
        const clearTables = allTables.filter(t => !KEEP_LIST.includes(t));

        console.log("Purging non-master data...");
        // Running TRUNCATE on all EXCEPT the master lists
        if (clearTables.length > 0) {
            await pool.query(`TRUNCATE TABLE ${clearTables.join(', ')} RESTART IDENTITY CASCADE;`);
            console.log("Purge of test data successful!");
        }

        // 5. COUNTS CHECK
        console.log("\n--- FINAL SYSTEM STATUS ---");
        const checkTables = ['chart_of_accounts', 'document_sequences', 'employees', 'sales_invoices'];
        for (const t of checkTables) {
            const countRes = await pool.query(`SELECT count(*) FROM ${t}`);
            console.log(`${t}: ${countRes.rows[0].count} rows`);
        }

    } catch (err) {
        console.error("Critical Error during Restoration/Purge:", err);
    } finally {
        await pool.end();
    }
}

restoreAndPurge();
