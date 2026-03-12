const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    const appData = data.data.app || data.data;
    const plugins = appData.plugins || {};

    const migrationData = {
        queries: [],
        jsQueries: [],
        transformers: [],
        components: []
    };

    Object.keys(plugins).forEach(key => {
        const plugin = plugins[key];
        const type = plugin.pluginTemplate ? plugin.pluginTemplate.type : null;
        const subType = plugin.pluginTemplate ? plugin.pluginTemplate.v.type : null;

        // Extract Queries (REST, DB, etc.)
        if (plugin.pluginTemplate && plugin.pluginTemplate.v.pluginType === 'datasource') {
            const queryData = plugin.pluginTemplate.v;
            migrationData.queries.push({
                name: key,
                type: queryData.type,
                resourceId: queryData.resourceId,
                query: queryData.template ? queryData.template.query : 'N/A'
            });
        }

        // Extract JS Logic
        if (type === 'JSQuery' || type === 'JavascriptQuery') {
            migrationData.jsQueries.push({
                name: key,
                code: plugin.pluginTemplate.v.query || 'N/A'
            });
        }

        // Extract Components
        if (plugin.pluginTemplate && plugin.pluginTemplate.v.widgetType) {
            const widget = plugin.pluginTemplate.v;
            migrationData.components.push({
                name: key,
                type: widget.widgetType,
                label: widget.template ? widget.template.label : null,
                data: widget.template ? widget.template.data : null
            });
        }
    });

    console.log(JSON.stringify(migrationData, null, 2));

} catch (e) {
    console.error('Failed to parse:', e.message);
    // Fallback: Regex for critical items if JSON is too complex/large
    const queries = content.match(/\\"id\\":\\"(q_[^\\"]+)\\"/g);
    console.log('Detected potentially important queries:', queries);
}
