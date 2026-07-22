const fs = require('fs');
const txt = fs.readFileSync('supply_chain_appstate.txt', 'utf8');

const regex = /(select|update|insert|delete|function|=>|\{\{).*?(from|where|return|await).*?/gi;
let match;
let count = 0;
while ((match = regex.exec(txt)) !== null && count < 100) {
  let val = match[0];
  if (val.length > 30 && val.length < 500) {
    console.log('---');
    console.log(val);
    count++;
  }
}
