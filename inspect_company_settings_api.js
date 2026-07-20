const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/company-settings');
    console.log('--- COMPANY SETTINGS FROM API ---');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

test();
