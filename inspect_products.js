const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5173/api/products');
    const list = Array.isArray(res.data) ? res.data : res.data.data || [];
    console.log('--- PRODUCT OBJECT ---');
    console.log(JSON.stringify(list[0], null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

test();
