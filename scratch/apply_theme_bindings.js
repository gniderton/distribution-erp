const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
console.log('Loading file from:', filePath);

const app = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Helper to safely bind a property to a JS dynamic binding and add to dynamicBindingPathList
function bindProperty(widget, propName, bindingValue) {
    widget[propName] = bindingValue;
    if (!widget.dynamicBindingPathList) {
        widget.dynamicBindingPathList = [];
    }
    // Prevent duplicates
    if (!widget.dynamicBindingPathList.some(item => item.key === propName)) {
        widget.dynamicBindingPathList.push({ key: propName });
    }
}

// Check if a color string looks like a default dark/neutral color (black, gray, dark gray, etc.)
function isDefaultDarkColor(color) {
    if (!color) return true;
    const c = String(color).trim().toLowerCase();
    return c === 'black' || 
           c === '#000' || 
           c === '#000000' || 
           c === '#303030' || 
           c === '#231f20' || 
           c === '#2e3d49' ||
           c === '#1c1917' || 
           c === '#090d16' ||
           c === 'undefined';
}

// Check if a color string is gray or secondary text gray
function isMutedColor(color) {
    if (!color) return false;
    const c = String(color).trim().toLowerCase();
    return c === 'gray' || 
           c === 'grey' || 
           c === '#7f7f7f' || 
           c === '#858282' || 
           c === '#7e8d9f' || 
           c === '#5a5a5a' || 
           c === '#8b949e' ||
           c === '#64748b' ||
           c === '#6b6b8a' ||
           c === '#737373';
}

// Check if a color string is a primary blue accent
function isPrimaryAccentColor(color) {
    if (!color) return false;
    const c = String(color).trim().toLowerCase();
    return c === 'blue' || 
           c === '#3b82f6' || 
           c === '#2188ff' || 
           c === '#4a90e2';
}

let widgetCount = 0;

// Recursive function to bind widget theme properties
function processWidget(widget, isRoot = false) {
    if (!widget) return;
    widgetCount++;

    const type = widget.type;

    // 1. Root container (MainContainer CANVAS_WIDGET) gets background color
    if (type === 'CANVAS_WIDGET' && isRoot) {
        bindProperty(widget, 'backgroundColor', '{{ appsmith.store.theme.background }}');
    }

    // 2. Container/Form/Modal widgets get surface backgrounds, borders, radii, and shadows
    if (type === 'CONTAINER_WIDGET' || type === 'FORM_WIDGET' || type === 'MODAL_WIDGET') {
        bindProperty(widget, 'backgroundColor', '{{ appsmith.store.theme.surface }}');
        bindProperty(widget, 'borderRadius', '{{ appsmith.store.theme.radius }}');
        bindProperty(widget, 'boxShadow', '{{ appsmith.store.theme.shadow }}');
        bindProperty(widget, 'borderColor', '{{ appsmith.store.theme.border }}');
        bindProperty(widget, 'borderWidth', '{{ Number(appsmith.store.theme.borderWidth) }}');
    }

    // 3. Tab widgets get surface background, radius, shadow, border
    if (type === 'TABS_WIDGET') {
        bindProperty(widget, 'accentColor', '{{ appsmith.store.theme.primary }}');
        bindProperty(widget, 'backgroundColor', '{{ appsmith.store.theme.surface }}');
        bindProperty(widget, 'borderRadius', '{{ appsmith.store.theme.radius }}');
        bindProperty(widget, 'boxShadow', '{{ appsmith.store.theme.shadow }}');
        bindProperty(widget, 'borderColor', '{{ appsmith.store.theme.border }}');
        bindProperty(widget, 'borderWidth', '{{ Number(appsmith.store.theme.borderWidth) }}');
    }

    // 4. Buttons get primary colors, small radii, and small shadows
    if (type === 'BUTTON_WIDGET' || type === 'ICON_BUTTON_WIDGET' || type === 'BUTTON_GROUP_WIDGET') {
        bindProperty(widget, 'buttonColor', '{{ appsmith.store.theme.primary }}');
        bindProperty(widget, 'borderRadius', '{{ appsmith.store.theme.radiusSm }}');
        bindProperty(widget, 'boxShadow', '{{ appsmith.store.theme.shadowSm }}');
        
        // If button group, we should also process inner buttons' colors
        if (widget.groupButtons) {
            Object.keys(widget.groupButtons).forEach(key => {
                const btn = widget.groupButtons[key];
                btn.buttonColor = '{{ appsmith.store.theme.primary }}';
            });
        }
    }

    // 5. Form inputs / selects get accent colors, text colors, small radii, and small shadows
    if (type === 'SELECT_WIDGET' || 
        type === 'INPUT_WIDGET_V2' || 
        type === 'MULTI_SELECT_WIDGET_V2' || 
        type === 'CURRENCY_INPUT_WIDGET' || 
        type === 'PHONE_PICKER_WIDGET' ||
        type === 'PHONE_INPUT_WIDGET' ||
        type === 'DATE_PICKER_WIDGET2') {
        
        bindProperty(widget, 'accentColor', '{{ appsmith.store.theme.primary }}');
        bindProperty(widget, 'borderRadius', '{{ appsmith.store.theme.radiusSm }}');
        bindProperty(widget, 'boxShadow', '{{ appsmith.store.theme.shadowSm }}');
        
        if (widget.labelTextColor !== undefined) {
            bindProperty(widget, 'labelTextColor', '{{ appsmith.store.theme.text }}');
        }
    }

    // 6. Text widgets get dynamic text color matching the theme
    if (type === 'TEXT_WIDGET') {
        const currentTextColor = widget.textColor;
        if (isDefaultDarkColor(currentTextColor)) {
            bindProperty(widget, 'textColor', '{{ appsmith.store.theme.text }}');
        } else if (isMutedColor(currentTextColor)) {
            bindProperty(widget, 'textColor', '{{ appsmith.store.theme.textMuted }}');
        } else if (isPrimaryAccentColor(currentTextColor)) {
            bindProperty(widget, 'textColor', '{{ appsmith.store.theme.primary }}');
        }
    }

    // 7. Table widgets get accent colors, radius, shadow, border
    if (type === 'TABLE_WIDGET_V2') {
        bindProperty(widget, 'accentColor', '{{ appsmith.store.theme.primary }}');
        bindProperty(widget, 'borderRadius', '{{ appsmith.store.theme.radiusSm }}');
        bindProperty(widget, 'boxShadow', '{{ appsmith.store.theme.shadowSm }}');
        bindProperty(widget, 'borderColor', '{{ appsmith.store.theme.border }}');
        bindProperty(widget, 'borderWidth', '{{ Number(appsmith.store.theme.borderWidth) }}');
        
        // Helper to bind column properties in primaryColumns
        const bindColumnProperty = (w, colId, propName, val) => {
            if (w.primaryColumns && w.primaryColumns[colId]) {
                w.primaryColumns[colId][propName] = val;
                const path = `primaryColumns.${colId}.${propName}`;
                if (!w.dynamicBindingPathList) w.dynamicBindingPathList = [];
                if (!w.dynamicBindingPathList.some(item => item.key === path)) {
                    w.dynamicBindingPathList.push({ key: path });
                }
            }
        };

        // Style all columns inside primaryColumns
        if (widget.primaryColumns) {
            Object.keys(widget.primaryColumns).forEach(colId => {
                const col = widget.primaryColumns[colId];
                
                // Bind cellBackground if it's static
                if (col.cellBackground && !col.cellBackground.includes('appsmith.store')) {
                    bindColumnProperty(widget, colId, 'cellBackground', '{{ appsmith.store.theme.surface }}');
                }
                // Bind textColor if it's static
                if (col.textColor && !col.textColor.includes('appsmith.store')) {
                    if (isDefaultDarkColor(col.textColor)) {
                        bindColumnProperty(widget, colId, 'textColor', '{{ appsmith.store.theme.text }}');
                    } else if (isMutedColor(col.textColor)) {
                        bindColumnProperty(widget, colId, 'textColor', '{{ appsmith.store.theme.textMuted }}');
                    } else if (isPrimaryAccentColor(col.textColor)) {
                        bindColumnProperty(widget, colId, 'textColor', '{{ appsmith.store.theme.primary }}');
                    }
                }
                // Bind buttonColor for button columns
                if (col.buttonColor && !col.buttonColor.includes('appsmith.store')) {
                    bindColumnProperty(widget, colId, 'buttonColor', '{{ appsmith.store.theme.primary }}');
                }
                // Bind menuColor for menu columns
                if (col.menuColor && !col.menuColor.includes('appsmith.store')) {
                    bindColumnProperty(widget, colId, 'menuColor', '{{ appsmith.store.theme.primary }}');
                }
                // Bind borderRadius
                if (col.borderRadius && !col.borderRadius.includes('appsmith.store')) {
                    bindColumnProperty(widget, colId, 'borderRadius', '{{ appsmith.store.theme.radiusSm }}');
                }
                // Bind boxShadow
                if (col.boxShadow && !col.boxShadow.includes('appsmith.store')) {
                    bindColumnProperty(widget, colId, 'boxShadow', '{{ appsmith.store.theme.shadowSm }}');
                }
            });
        }
    }

    // Recurse down children tree
    if (widget.children) {
        widget.children.forEach(child => processWidget(child, false));
    }
}

// Apply theming to all layouts on all pages
app.pageList.forEach(page => {
    const pageName = page.unpublishedPage.name;
    const layouts = page.unpublishedPage.layouts || [];
    layouts.forEach(layout => {
        if (layout.dsl) {
            // Process the root container (MainContainer)
            processWidget(layout.dsl, true);
        }
    });
    console.log(`Themed widgets for page layouts of page: "${pageName}"`);
});

console.log(`Total processed widgets across all layouts: ${widgetCount}`);

// Save modified JSON
fs.writeFileSync(filePath, JSON.stringify(app, null, 2), 'utf8');
console.log('Successfully completed applying theme bindings to all widgets!');
