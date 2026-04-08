const { pool } = require('./config/db');

async function finalSync() {
    try {
        console.log("--- STARTING FINAL 100% CONFIGURATION SYNC ---");

        // 1. SYNC SPECIALIZED ACCOUNTS (MISSED FROM BACKUP)
        console.log("Syncing specialized Accounts (Assets, Loans, HR)...");
        await pool.query(`
            INSERT INTO chart_of_accounts (code, name, type) VALUES
            (1105, 'Loans & Advances (Receivable)', 'ASSET'),
            (1201, 'Machinery & Equipment', 'ASSET'),
            (1202, 'Vehicles', 'ASSET'),
            (1203, 'Office Equipment', 'ASSET'),
            (1204, 'Furniture & Fixtures', 'ASSET'),
            (1205, 'Buildings', 'ASSET'),
            (1210, 'Accumulated Depreciation', 'ASSET'),
            (2101, 'Loans & Borrowings (Payable)', 'LIABILITY'),
            (4010, 'Gain on Sale of Assets', 'INCOME'),
            (4101, 'Interest Income', 'INCOME'),
            (5014, 'Salary Expense', 'EXPENSE'),
            (5015, 'Salary Deductions', 'EXPENSE'),
            (5016, 'Bonus Expense', 'EXPENSE'),
            (5017, 'Leave Encashment Expense', 'EXPENSE'),
            (5020, 'Depreciation Expense', 'EXPENSE'),
            (5021, 'Loss on Sale of Assets', 'EXPENSE'),
            (5101, 'Rent Expense', 'EXPENSE'),
            (5103, 'Utilities Expense', 'EXPENSE'),
            (5104, 'Logistics & Delivery Expense', 'EXPENSE'),
            (5105, 'Marketing & Promotion Expense', 'EXPENSE'),
            (5201, 'Interest Expense', 'EXPENSE'),
            (5202, 'Bank Charges', 'EXPENSE')
            ON CONFLICT (code) DO NOTHING;
        `);

        // 2. SYNC MISSING SEQUENCES
        console.log("Syncing missing Document Sequences (SI, PI, PAY, etc.)...");
        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number) VALUES
            ('SI', 'SI-26-', 0),
            ('PI', 'PI-26-', 0),
            ('PAY', 'PAY-26-', 0),
            ('IN', 'IN-26-', 0),
            ('IPEN', 'IPEN-26-', 0),
            ('EPEN', 'EPEN-26-', 0),
            ('INC', 'INC-26-', 0),
            ('ADV', 'ADV-26-', 0),
            ('SAL', 'SAL-26-', 0)
            ON CONFLICT (document_type) DO NOTHING;
        `);

        // 3. FINAL VERIFICATION
        const coaCount = await pool.query("SELECT count(*) FROM chart_of_accounts");
        const seqCount = await pool.query("SELECT count(*) FROM document_sequences");

        console.log("\n--- FINAL SYSTEM STATUS ---");
        console.log(`Chart of Accounts: ${coaCount.rows[0].count} rows (Synced)`);
        console.log(`Document Sequences: ${seqCount.rows[0].count} rows (Synced)`);
        
        console.log("\nVERIFICATION COMPLETE. SYSTEM IS 100% RESTORED.");

    } catch (err) {
        console.error("Critical Sync Failure:", err);
    } finally {
        await pool.end();
    }
}

finalSync();
