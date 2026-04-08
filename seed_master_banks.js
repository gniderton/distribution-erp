const { pool } = require('./config/db');

async function seedMasterBanks() {
    const banks = [
        "State Bank of India (SBI)", "Bank of Baroda (BoB)", "Punjab National Bank (PNB)", "Canara Bank", 
        "Union Bank of India", "Bank of India (BoI)", "Indian Bank", "Central Bank of India", 
        "Indian Overseas Bank (IOB)", "UCO Bank", "Bank of Maharashtra (BoM)", "Corporation Bank", 
        "Vijaya Bank", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "IndusInd Bank", 
        "Yes Bank", "IDFC First Bank", "Federal Bank", "RBL Bank", "South Indian Bank", "Lakshmi Vilas Bank", 
        "DCB Bank", "Bandhan Bank", "Karur Vysya Bank", "Standard Chartered Bank", "Citibank India", 
        "HSBC India", "Barclays Bank", "Deutsche Bank", "BNP Paribas", "Royal Bank of Scotland", 
        "JPMorgan Chase", "Bank of America", "The Hongkong and Shanghai Banking Corporation (HSBC)", 
        "Andhra Pradesh Grameena Vikas Bank", "Arunachal Pradesh Rural Bank", "Assam Gramin Vikash Bank", 
        "Baroda Uttar Pradesh Gramin Bank", "Bihar Gramin Bank", "Chhattisgarh Rajya Gramin Bank", 
        "Dena Gujarat Gramin Bank", "Himachal Pradesh Gramin Bank", "Jammu & Kashmir Gramin Bank", 
        "Karnataka Vikas Grameena Bank", "Kerala Gramin Bank", "Madhya Bihar Gramin Bank", 
        "Maharashtra Gramin Bank", "Mizoram Rural Bank", "Nagaland Rural Bank", "Odisha Gramya Bank", 
        "Puduvai Bharathiar Grama Bank", "Punjab Gramin Bank", "Rajasthan Marudhara Gramin Bank", 
        "Uttarakhand Gramin Bank", "Ujjivan Small Finance Bank", "Equitas Small Finance Bank", 
        "A U Small Finance Bank", "Suryoday Small Finance Bank", "FINO Small Finance Bank", 
        "Jana Small Finance Bank", "ESAF Small Finance Bank", "Capital Small Finance Bank", 
        "Paytm Payments Bank", "India Post Payments Bank (IPPB)", "Airtel Payments Bank", 
        "Jio Payments Bank", "Fino Payments Bank", "The Maharashtra State Co-operative Bank", 
        "The Karnataka State Co-operative Bank", "The Delhi State Co-operative Bank", 
        "The Tamil Nadu State Co-operative Bank", "The West Bengal State Co-operative Bank", 
        "The Punjab State Co-operative Bank", "The Uttar Pradesh Co-operative Bank", "DBS Bank", 
        "Feroke Co-operative Urban Bank", "IDBI Bank", "Kerala Bank", "CSB Bank", "Dhanlaxmi Bank"
    ];

    try {
        console.log("--- SEEDING MASTER BANKS ---");
        
        // 1. Clear existing banks
        console.log("Truncating 'master_banks'...");
        await pool.query("TRUNCATE master_banks RESTART IDENTITY CASCADE");

        // 2. Insert all banks
        console.log(`Inserting ${banks.length} banks...`);
        for (const bank of banks) {
            await pool.query(
                "INSERT INTO master_banks (bank_name, is_active) VALUES ($1, $2)",
                [bank, true]
            );
        }

        // 3. Verify
        const res = await pool.query("SELECT count(*) FROM master_banks");
        console.log(`\nSUCCESS: ${res.rows[0].count} banks online.`);
        
        const sample = await pool.query("SELECT bank_name FROM master_banks LIMIT 5");
        console.log("SAMPLE ENTRIES:");
        sample.rows.forEach(r => console.log(` - ${r.bank_name}`));

    } catch (err) {
        console.error("Critical Error seeding master_banks:", err);
    } finally {
        await pool.end();
    }
}

seedMasterBanks();
