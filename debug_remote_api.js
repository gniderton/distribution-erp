const https = require('https');

function getRemoteInvoices() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'distribution-erp.onrender.com',
            port: 443,
            path: '/api/sales/invoices?limit=5',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(body);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

function getRemoteInvoiceLines(id) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'distribution-erp.onrender.com',
            port: 443,
            path: `/api/sales/invoices/${id}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(body);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function run() {
    try {
        console.log('--- Checking Remote API (distribution-erp.onrender.com) ---');
        const invoices = await getRemoteInvoices();
        console.log(`Found ${invoices.length} recent invoices.`);
        
        for (const inv of invoices) {
            console.log(`\nInvoice: ${inv.invoice_number} (ID: ${inv.id})`);
            const details = await getRemoteInvoiceLines(inv.id);
            const lines = details.lines || [];
            console.log(`Lines: ${lines.length}`);
            lines.forEach(l => {
                console.log(`  Line ID ${l.id}: Batch ID: ${l.batch_id}, Product: ${l.product_name}`);
            });
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
