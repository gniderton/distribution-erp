const https = require('https');

function testSupabase() {
    const supabaseUrl = 'https://hcwbynrhwqeqevwhhwsj.supabase.co/rest/v1/';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjd2J5bnJod3FlcWV2d2hod3NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUxMDg3OSwiZXhwIjoyMDk3MDg2ODc5fQ.ejFBN_yCQ3PLdC4C0P-nqja2ZPeF_crrShL76kzMEGk';

    const options = {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    };

    console.log("Testing access to Supabase REST API via built-in https module...");
    https.get(supabaseUrl, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`Connection status: ${res.statusCode} ${res.statusMessage}`);
            try {
                const parsed = JSON.parse(data);
                console.log("Database connection successful!");
                console.log("Database schema info (definitions/tables):", Object.keys(parsed.definitions || {}));
            } catch (e) {
                console.log("Raw Response Data:", data);
            }
        });
    }).on('error', (err) => {
        console.error("Failed to connect to Supabase:", err.message);
    });
}

testSupabase();
