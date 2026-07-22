const fs = require('fs');
const txt = fs.readFileSync('supply_chain_appstate.txt', 'utf8');

// The Retool appState is essentially a massive JSON string encoded as EDN/Transit or similar arrays.
// It often contains escaped JSON or large strings.
// A brute force way to find JS code or SQL queries is to match "query":"..."
let match;
const regex = /"query":"([^"]+)"/g;
while ((match = regex.exec(txt)) !== null) {
  let val = match[1];
  val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
  if (val.length > 20) {
    console.log('-------------------------');
    console.log(val);
  }
}
