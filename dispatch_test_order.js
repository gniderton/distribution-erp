const https = require('https');

const orderId = 7;
const options = {
    hostname: 'distribution-erp.onrender.com',
    port: 443,
    path: `/api/sales/orders/${orderId}/dispatch`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, res => {
    console.log(`StatusCode: ${res.statusCode}`);

    let data = '';
    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
