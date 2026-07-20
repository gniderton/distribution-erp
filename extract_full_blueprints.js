const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json';

console.log('Loading JSON...');
const app = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const pages = app.pageList || [];
const actions = app.actionList || [];
const actionCollections = app.actionCollectionList || [];

const blueprint = {
  summary: {
    totalPages: pages.length,
    totalActions: actions.length,
    totalJSObjects: actionCollections.length
  },
  pages: []
};

pages.forEach(p => {
  const pageDetails = p.unpublishedPage || p.publishedPage || {};
  const pageName = pageDetails.name || p.name;
  const layouts = pageDetails.layouts || [];
  
  const pageBlueprint = {
    name: pageName,
    tables: [],
    forms: [],
    selects: [],
    jsObjects: [],
    queries: []
  };

  // Extract JS Objects for this page (match by pageName)
  actionCollections.forEach(ac => {
    const unpub = ac.unpublishedCollection || ac.publishedCollection || {};
    if (unpub.pageId === pageName) {
      pageBlueprint.jsObjects.push({
        name: unpub.name,
        body: unpub.body // The JS code body
      });
    }
  });

  // Extract Queries/APIs for this page (match by pageName)
  actions.forEach(a => {
    const unpub = a.unpublishedAction || a.publishedAction || {};
    if (unpub.pageId === pageName) {
      pageBlueprint.queries.push({
        name: unpub.name,
        pluginType: unpub.pluginType,
        datasource: unpub.datasource?.name || 'No DS',
        actionConfiguration: unpub.actionConfiguration
      });
    }
  });

  // Extract Widgets
  layouts.forEach(l => {
    const rootWidget = l.dsl || {};
    
    function traverse(w) {
      if (!w) return;
      
      // Categorize Table Widgets
      if (w.type === 'TABLE_WIDGET' || w.type === 'TABLE_WIDGET_V2') {
        const columns = [];
        if (w.primaryColumns) {
          for (const [colKey, colVal] of Object.entries(w.primaryColumns)) {
            columns.push({
              name: colVal.label || colKey,
              id: colVal.id,
              isEditable: colVal.isEditable === true || colVal.isEditable === 'true',
              columnType: colVal.columnType,
              computedValue: colVal.computedValue
            });
          }
        }
        
        pageBlueprint.tables.push({
          name: w.widgetName,
          tableData: w.tableData,
          columns: columns,
          onRowSelected: w.onRowSelected,
          onSave: w.onSave, // Trigger for inline cell editing save
          onPageChange: w.onPageChange,
          serverSidePagination: w.serverSidePagination === true
        });
      }

      // Categorize Forms & Input Widgets
      if (w.type === 'FORM_WIDGET') {
        pageBlueprint.forms.push({
          name: w.widgetName,
          children: (w.children || []).map(c => c.widgetName)
        });
      }

      // Categorize Dropdown Selects
      if (w.type === 'SELECT_WIDGET') {
        pageBlueprint.selects.push({
          name: w.widgetName,
          options: w.options,
          defaultOptionValue: w.defaultOptionValue,
          onOptionChange: w.onOptionChange
        });
      }

      if (w.children) {
        w.children.forEach(traverse);
      }
    }
    
    traverse(rootWidget);
  });

  blueprint.pages.push(pageBlueprint);
});

// Write detailed blueprint report
fs.writeFileSync('erp_detailed_blueprint.json', JSON.stringify(blueprint, null, 2), 'utf8');
console.log('Blueprint JSON written.');

// Create a markdown summary
let md = `# GNIDERTON ERP Blueprint & Logical Specifications\n\n`;
md += `This document lists the widgets, logic tables, actions, and custom rules for every page of the GNIDERTON ERP system to construct a pixel-perfect React replica.\n\n`;

blueprint.pages.forEach(p => {
  md += `## Page: ${p.name}\n\n`;
  
  md += `### 1. JS Objects & Custom Functions\n`;
  if (p.jsObjects.length === 0) md += `* None\n`;
  p.jsObjects.forEach(js => {
    md += `* **${js.name}**\n`;
  });
  
  md += `\n### 2. Queries & Data Bindings\n`;
  if (p.queries.length === 0) md += `* None\n`;
  p.queries.forEach(q => {
    md += `* **${q.name}** [${q.pluginType}] [DS: ${q.datasource}] -> \`${q.actionConfiguration?.httpMethod || 'DB'} ${q.actionConfiguration?.path || ''}\`\n`;
  });

  md += `\n### 3. Data Tables & Interactive Grid Rules\n`;
  if (p.tables.length === 0) md += `* None\n`;
  p.tables.forEach(t => {
    md += `* **Table: ${t.name}**\n`;
    md += `  * Server-side Pagination: \`${t.serverSidePagination}\`\n`;
    md += `  * Columns:\n`;
    t.columns.forEach(c => {
      md += `    * \`${c.id}\` (Label: "${c.name}", Type: ${c.columnType}, Editable: ${c.isEditable})\n`;
    });
    if (t.onSave) md += `  * **OnSave Event**: \`${JSON.stringify(t.onSave)}\`\n`;
    if (t.onRowSelected) md += `  * **OnRowSelected Event**: \`${JSON.stringify(t.onRowSelected)}\`\n`;
  });

  md += `\n### 4. Dropdowns & Inputs\n`;
  if (p.selects.length === 0) md += `* None\n`;
  p.selects.forEach(s => {
    md += `* **Select: ${s.name}**\n`;
    if (s.onOptionChange) md += `  * OnChange Event: \`${JSON.stringify(s.onOptionChange)}\`\n`;
  });
  
  md += `\n---\n\n`;
});

fs.writeFileSync('erp_blueprint_report.md', md, 'utf8');
console.log('Markdown report written.');
