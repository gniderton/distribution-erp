const http = require('http');

const testUrl = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        let bodyStr = null;
        const headers = {
            'Content-Type': 'application/json'
        };
        if (body) {
            bodyStr = JSON.stringify(body);
            headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', err => reject(err));
        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
};

async function runTests() {
    try {
        console.log("--- Testing Template Downloads ---");
        const routeTemplate = await testUrl('/api/routes/template');
        console.log("Route Template:", routeTemplate.status, routeTemplate.body);

        const custTemplate = await testUrl('/api/customers/template');
        console.log("Customer Template:", custTemplate.status, custTemplate.body);

        console.log("--- Testing GET Routes ---");
        const routes = await testUrl('/api/routes');
        console.log("Routes GET Status:", routes.status);
        console.log("Routes Count:", Array.isArray(routes.body) ? routes.body.length : 'Not an array');

        console.log("--- Testing GET Customers ---");
        const customers = await testUrl('/api/customers');
        console.log("Customers GET Status:", customers.status);
        console.log("Customers Count:", Array.isArray(customers.body) ? customers.body.length : 'Not an array');

        console.log("--- Testing Bulk Upload Route ---");
        const routeBulkData = [
            ["Route Name", "Description", "Service Day", "Is Active"],
            ["Test Route 99", "Dynamic test route description", "Wednesday", "true"]
        ];
        const routeBulk = await testUrl('/api/routes/bulk', 'POST', routeBulkData);
        console.log("Route Bulk Upload:", routeBulk.status, routeBulk.body);

        console.log("--- Testing Bulk Upload Customer ---");
        const customerBulkData = [
            ["Customer Name", "Customer Phone", "Email", "GSTIN", "PAN", "Route Name", "Employee Name", "Channel Name", "WhatsApp Number", "Is Active"],
            ["Dynamic Upload Cust 1", "9876543210", "cust1@test.com", "32ABCDE1234F1Z1", "ABCDE1234F", "Test Route 99", "", "", "9876543210", "true"]
        ];
        const customerBulk = await testUrl('/api/customers/bulk', 'POST', customerBulkData);
        console.log("Customer Bulk Upload:", customerBulk.status, customerBulk.body);

        // Fetch to find their IDs and test delete
        const customersAfter = await testUrl('/api/customers');
        const insertedCust = customersAfter.body.find(c => c.customer_name === "Dynamic Upload Cust 1");
        
        const routesAfter = await testUrl('/api/routes');
        const insertedRoute = routesAfter.body.find(r => r.route_name === "Test Route 99");

        console.log("--- Testing Bulk Delete ---");
        if (insertedCust) {
            const custDel = await testUrl('/api/customers', 'DELETE', [insertedCust.id]);
            console.log("Delete Customer:", custDel.status, custDel.body);
        }
        if (insertedRoute) {
            const routeDel = await testUrl('/api/routes', 'DELETE', [insertedRoute.id]);
            console.log("Delete Route:", routeDel.status, routeDel.body);
        }

    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        process.exit();
    }
}

// Wait a little for DB migration to finish background checks
setTimeout(runTests, 2000);
