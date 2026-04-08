const axios = require('axios');

async function testSMS() {
    const url = 'http://localhost:3000/api/bank-inbound/webhook/sms-alerts';
    
    const sampleSMS = {
        content: "Your a/c XX1234 has been credited with INR 5,000.00 on 01-04-2026. Ref: 612345678901. Avail Bal: INR 1,50,000.00.",
        from: "IDFCFB",
        timestamp: new Date().toISOString()
    };

    console.log("Testing IDFC SMS Parsing...");
    try {
        const res = await axios.post(url, sampleSMS);
        console.log("Response:", res.data);
        
        console.log("\nTesting Deduplication (Sending same SMS again)...");
        const res2 = await axios.post(url, sampleSMS);
        console.log("Response:", res2.data);

    } catch (err) {
        console.error("Test Failed:", err.response ? err.response.data : err.message);
    }
}

testSMS();
