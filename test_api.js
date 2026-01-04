const https = require('https');

const options = {
    hostname: 'smart-points-sin.loca.lt',
    port: 443,
    path: '/api/vendors',
    method: 'GET',
    headers: {
        'Bypass-Tunnel-Reminder': 'true',
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log("Tunnel Status:", res.statusCode);
        console.log("Tunnel Body:", data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
