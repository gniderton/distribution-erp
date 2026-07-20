const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5173/api/finance/reconciliation/bank/unconsumed-debits');
    console.log('--- UNCONSUMED DEBITS DATA ---');
    console.log(JSON.stringify(res.data.slice(0, 5), null, 2));
  } catch (err) {
    // If local server is not running or needs headers, let's load from backend folder directly!
    console.log('Error fetching from local API, let us read local files if there is a db mock.');
  }
}

test();
