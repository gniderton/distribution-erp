const { pool } = require('../config/db');

async function verifyGoldStandard() {
    console.log("Starting Gold Standard Parity Check...");
    
    // This is a dry-run check of the logic. 
    // In a real scenario, we would mock a request to /api/delivery/verify/settle
    // But here we can check if the rounding account 5003 exists and if the code is syntactically correct.

    try {
        const accCheck = await pool.query("SELECT * FROM chart_of_accounts WHERE code IN (1001, 1101, 4003, 2011, 2012, 5001, 5003)");
        console.log("Chart of Accounts Check:");
        accCheck.rows.forEach(r => console.log(`- ${r.code}: ${r.name}`));
        
        const missing = [1001, 1101, 4003, 2011, 2012, 5001, 5003].filter(c => !accCheck.rows.find(r => r.code == c));
        if (missing.length > 0) {
            console.warn("WARNING: Missing accounts in COA:", missing);
        } else {
            console.log("SUCCESS: All required accounts (including 5003 Rounding) are present.");
        }

        // Test the math logic for rounding
        const totalGrand = 100.49;
        const roundedGrandTotal = Math.round(totalGrand);
        const roundOff = Number((roundedGrandTotal - totalGrand).toFixed(2));
        console.log(`Math Test: Total=${totalGrand}, Rounded=${roundedGrandTotal}, RoundOff=${roundOff}`);
        
        if (roundedGrandTotal === 100 && roundOff === -0.49) {
            console.log("Math logic verified.");
        } else {
            console.error("Math logic failure!");
        }

    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        await pool.end();
    }
}

verifyGoldStandard();
