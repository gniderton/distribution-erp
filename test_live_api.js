const http = require('https');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`https://distribution-erp.onrender.com${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data.slice(0, 200));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const routes = [
    '/api/vendors',
    '/api/purchase-orders',
    '/api/purchase-invoices',
    '/api/products',
    '/api/master/brands',
    '/api/master/categories',
    '/api/master/taxes',
    '/api/bank-accounts'
  ];

  for (const r of routes) {
    try {
      const res = await get(r);
      console.log(`Route: ${r}`);
      if (Array.isArray(res)) {
        console.log(`  Type: Array (Length: ${res.length})`);
        console.log(`  First item keys:`, Object.keys(res[0] || {}));
      } else if (res && typeof res === 'object') {
        console.log(`  Type: Object (Keys: [${Object.keys(res).join(', ')}])`);
        if (res.data) {
          console.log(`    data isArray: ${Array.isArray(res.data)}`);
          if (Array.isArray(res.data)) {
            console.log(`    data Length: ${res.data.length}`);
            console.log(`    First item keys:`, Object.keys(res.data[0] || {}));
          }
        }
      } else {
        console.log(`  Raw snippet:`, String(res).slice(0, 100));
      }
    } catch (e) {
      console.log(`Route: ${r} - Error: ${e.message}`);
    }
  }
}

run();
