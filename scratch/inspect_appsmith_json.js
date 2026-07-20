const fs = require('fs');
const path = require('path');

const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

console.log("Keys of the main object:");
console.log(Object.keys(f2));

if (f2.pageList) {
  console.log("pageList length:", f2.pageList.length);
}
if (f2.pages) {
  console.log("pages length:", f2.pages.length);
}
// Let's inspect decencies
const keys = Object.keys(f2);
for (let key of keys) {
  if (Array.isArray(f2[key])) {
    console.log(`Key ${key} is array of length ${f2[key].length}`);
    if (f2[key].length > 0) {
      console.log(`First element keys of ${key}:`, Object.keys(f2[key][0]));
    }
  } else if (typeof f2[key] === 'object' && f2[key] !== null) {
    console.log(`Key ${key} is object with keys:`, Object.keys(f2[key]));
  } else {
    console.log(`Key ${key} has type ${typeof f2[key]}`);
  }
}
