const fs = require('fs');
const data = fs.readFileSync('supply_chain_appstate.txt', 'utf8');

// The file contains strings like \"query\":\"SELECT * FROM...\"
// Or \"pluginType\":\"JSCode\"
// Let's just extract all substrings that look like code or SQL
const strings = data.match(/"([^"]*?select [^"]*?)"/gi) || [];
const strings2 = data.match(/"([^"]*?update [^"]*?)"/gi) || [];
const strings3 = data.match(/"([^"]*?insert [^"]*?)"/gi) || [];
const strings4 = data.match(/"([^"]*?function[ ]*?\([^"]*?)"/gi) || [];

const all = [...strings, ...strings2, ...strings3, ...strings4];
const unique = [...new Set(all)].map(s => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t'));

fs.writeFileSync('supply_chain_extracted.txt', unique.join('\n\n========================\n\n'));
