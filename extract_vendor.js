const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const pageName = 'Vendor';

let out = '--- VENDOR PAGE ARCHITECTURE ---\n';

const page = app.pageList.find(p => {
  const details = p.unpublishedPage || p.publishedPage || {};
  return details.name === pageName;
});

if (!page) {
  console.log(`${pageName} page not found.`);
  process.exit(1);
}

const details = page.unpublishedPage || page.publishedPage || {};
const layouts = details.layouts || [];
const dsl = layouts[0]?.dsl || {};

function traverse(w, depth = 0) {
  if (!w) return;
  const indent = '  '.repeat(depth);
  const info = {
    name: w.widgetName,
    type: w.type,
    text: w.text || w.label || '',
    events: []
  };

  for (const k of Object.keys(w)) {
    if (k.startsWith('on') && w[k]) {
      info.events.push(`${k}: ${JSON.stringify(w[k])}`);
    }
  }

  out += `${indent}- ${w.name} [Type: ${w.type}] ${w.text ? '(Label: "' + w.text + '")' : ''}\n`;
  info.events.forEach(e => {
    out += `${indent}    * Event -> ${e}\n`;
  });

  if (w.type === 'TABLE_WIDGET_V2') {
    out += `${indent}    * Table Columns:\n`;
    const cols = w.primaryColumns || w.customColumns || {};
    for (const cName of Object.keys(cols)) {
      const col = cols[cName];
      out += `${indent}      - ${cName} (Label: "${col.label || col.id}", Type: ${col.columnType}, Editable: ${col.isCellEditable === true})\n`;
      for (const eventKey of Object.keys(col)) {
        if (eventKey.startsWith('on') && col[eventKey]) {
          out += `${indent}        * Col Event -> ${eventKey}: ${JSON.stringify(col[eventKey])}\n`;
        }
      }
    }
  }

  if (w.children) {
    w.children.forEach(c => traverse(c, depth + 1));
  }
}

traverse(dsl);

// Find API Queries connected to the page
out += '\n--- CONNECTED QUERIES & API ENDPOINTS ---\n';
if (app.actionList) {
  app.actionList.forEach(a => {
    const act = a.unpublishedAction || a.publishedAction || {};
    if (act.pageId === pageName) {
      out += `- Action Query: ${act.name}\n`;
      if (act.actionConfiguration) {
        out += `  Path: ${act.actionConfiguration.path || ''}\n`;
        out += `  Method: ${act.actionConfiguration.httpMethod || ''}\n`;
        out += `  Query Parameters: ${JSON.stringify(act.actionConfiguration.queryParameters || [])}\n`;
        out += `  Body: ${JSON.stringify(act.actionConfiguration.body || '')}\n`;
      }
    }
  });
}

// Find JS Objects (JS libraries/scripts) connected to the page
out += '\n--- CONNECTED JS OBJECTS (JS SCRIPTS) ---\n';
if (app.actionCollectionList) {
  app.actionCollectionList.forEach(ac => {
    const coll = ac.unpublishedCollection || ac.publishedCollection || {};
    if (coll.pageId === pageName) {
      out += `- JS Object: ${coll.name}\n`;
      if (coll.body) {
        out += `  Code:\n${coll.body}\n\n`;
      }
    }
  });
}

fs.writeFileSync('vendor_blueprint.txt', out, 'utf8');
console.log('Finished writing Vendor blueprint.');
