const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
console.log('Loading file from:', filePath);

const app = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Helper to generate 10-char alphanumeric IDs for Appsmith widgets and actions
function generateId() {
    return Math.random().toString(36).substring(2, 12);
}

// 1. Hide default navigation bar globally
if (app.exportedApplication.unpublishedApplicationDetail) {
    app.exportedApplication.unpublishedApplicationDetail.navigationSetting.showNavbar = false;
}
if (app.exportedApplication.publishedApplicationDetail) {
    app.exportedApplication.publishedApplicationDetail.navigationSetting.showNavbar = false;
}

// Extract existing page names for our select navigation options
const existingPages = app.pageList.map(p => p.unpublishedPage.name);
console.log('Original pages count:', existingPages.length);

const selectOptions = existingPages.map(name => ({
    label: name,
    value: name
}));

// Shift widgets down by 5 rows on a page to make room for our custom navigation header
function shiftWidgetsDown(dsl) {
    if (!dsl) return;
    if (dsl.children) {
        dsl.children.forEach(child => {
            if (typeof child.topRow === 'number') {
                child.topRow += 6;
            }
            if (typeof child.bottomRow === 'number') {
                child.bottomRow += 6;
            }
            if (child.originalTopRow !== undefined) child.originalTopRow += 6;
            if (child.originalBottomRow !== undefined) child.originalBottomRow += 6;
        });
    }
}

// 2. Loop through all 21 original pages and prepend the Auth check and custom header
app.pageList.forEach(p => {
    const pageName = p.unpublishedPage.name;
    console.log(`Processing page: "${pageName}"`);

    // A. Prepend header widget to layouts
    const layouts = p.unpublishedPage.layouts || [];
    layouts.forEach(layout => {
        const dsl = layout.dsl;
        if (dsl) {
            // Shift existing widgets down
            shiftWidgetsDown(dsl);

            // Generate widget IDs
            const headerContainerId = generateId();
            const headerCanvasId = generateId();
            const logoTextId = generateId();
            const selectNavId = generateId();
            const logoutBtnId = generateId();

            // Create inner canvas for container
            const headerCanvas = {
                widgetName: `Canvas_${headerContainerId}`,
                topRow: 0,
                bottomRow: 6,
                parentRowSpace: 1,
                type: "CANVAS_WIDGET",
                canExtend: false,
                shouldScrollContents: false,
                minHeight: 50,
                parentColumnSpace: 1,
                leftColumn: 0,
                rightColumn: 64,
                detachFromLayout: true,
                widgetId: headerCanvasId,
                parentId: headerContainerId,
                renderMode: "CANVAS",
                version: 1,
                children: [
                    // Text logo/title
                    {
                        widgetName: "txtHeaderTitle",
                        type: "TEXT_WIDGET",
                        topRow: 1,
                        bottomRow: 5,
                        leftColumn: 1,
                        rightColumn: 15,
                        text: "GNIDERTON ERP",
                        fontSize: "1.25rem",
                        fontStyle: "BOLD",
                        textColor: "#3b82f6",
                        alignment: "LEFT",
                        widgetId: logoTextId,
                        parentId: headerCanvasId,
                        renderMode: "CANVAS",
                        version: 1,
                        isVisible: true
                    },
                    // Button Group for page navigation categories
                    {
                        widgetName: "btnGroupPageNav",
                        type: "BUTTON_GROUP_WIDGET",
                        topRow: 1,
                        bottomRow: 5,
                        leftColumn: 16,
                        rightColumn: 52,
                        orientation: "horizontal",
                        buttonVariant: "PRIMARY",
                        isVisible: true,
                        widgetId: selectNavId,
                        parentId: headerCanvasId,
                        renderMode: "CANVAS",
                        version: 1,
                        groupButtons: {
                            btnSales: {
                                id: "btnSales",
                                index: 0,
                                label: "Sales & Inventory",
                                buttonType: "MENU",
                                isVisible: true,
                                isDisabled: false,
                                buttonColor: "{{appsmith.theme.colors.primaryColor}}",
                                menuItems: {
                                    item1: { id: "item1", index: 0, label: "Inventory", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Inventory') }}" },
                                    item2: { id: "item2", index: 1, label: "Items", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Items') }}" },
                                    item3: { id: "item3", index: 2, label: "Sales Order", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Sales Order') }}" },
                                    item4: { id: "item4", index: 3, label: "Invoice", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Invoice') }}" },
                                    item5: { id: "item5", index: 4, label: "Schemes", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Schemes') }}" },
                                    item6: { id: "item6", index: 5, label: "Customer", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Customer') }}" },
                                    item7: { id: "item7", index: 6, label: "Credit Note", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Credit Note') }}" },
                                    item8: { id: "item8", index: 7, label: "GST", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('GST') }}" }
                                }
                            },
                            btnPurchasing: {
                                id: "btnPurchasing",
                                index: 1,
                                label: "Purchasing",
                                buttonType: "MENU",
                                isVisible: true,
                                isDisabled: false,
                                buttonColor: "{{appsmith.theme.colors.primaryColor}}",
                                menuItems: {
                                    item1: { id: "item1", index: 0, label: "Vendor", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Vendor') }}" },
                                    item2: { id: "item2", index: 1, label: "Debit Notes", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Debit Notes') }}" },
                                    item3: { id: "item3", index: 2, label: "Migration Setup", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Migration Setup') }}" }
                                }
                            },
                            btnFinance: {
                                id: "btnFinance",
                                index: 2,
                                label: "Finance",
                                buttonType: "MENU",
                                isVisible: true,
                                isDisabled: false,
                                buttonColor: "{{appsmith.theme.colors.primaryColor}}",
                                menuItems: {
                                    item1: { id: "item1", index: 0, label: "Loan", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Loan') }}" },
                                    item2: { id: "item2", index: 1, label: "Assets", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Assets') }}" },
                                    item3: { id: "item3", index: 2, label: "Cheque Management", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Cheque Management') }}" },
                                    item4: { id: "item4", index: 3, label: "Transactions", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Transactions') }}" },
                                    item5: { id: "item5", index: 4, label: "Payment Settlement", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Payment Settlement') }}" }
                                }
                            },
                            btnOps: {
                                id: "btnOps",
                                index: 3,
                                label: "Operations",
                                buttonType: "MENU",
                                isVisible: true,
                                isDisabled: false,
                                buttonColor: "{{appsmith.theme.colors.primaryColor}}",
                                menuItems: {
                                    item1: { id: "item1", index: 0, label: "Reports", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Reports') }}" },
                                    item2: { id: "item2", index: 1, label: "HR", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('HR') }}" },
                                    item3: { id: "item3", index: 2, label: "Settings", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Settings') }}" },
                                    item4: { id: "item4", index: 3, label: "Incentives", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Incentives') }}" },
                                    item5: { id: "item5", index: 4, label: "Supply Chain", isVisible: true, isDisabled: false, onClick: "{{ navigateTo('Supply Chain Management') }}" }
                                }
                            }
                        },
                        dynamicTriggerPathList: [
                            { key: "groupButtons.btnSales.menuItems.item1.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item2.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item3.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item4.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item5.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item6.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item7.onClick" },
                            { key: "groupButtons.btnSales.menuItems.item8.onClick" },
                            { key: "groupButtons.btnPurchasing.menuItems.item1.onClick" },
                            { key: "groupButtons.btnPurchasing.menuItems.item2.onClick" },
                            { key: "groupButtons.btnPurchasing.menuItems.item3.onClick" },
                            { key: "groupButtons.btnFinance.menuItems.item1.onClick" },
                            { key: "groupButtons.btnFinance.menuItems.item2.onClick" },
                            { key: "groupButtons.btnFinance.menuItems.item3.onClick" },
                            { key: "groupButtons.btnFinance.menuItems.item4.onClick" },
                            { key: "groupButtons.btnFinance.menuItems.item5.onClick" },
                            { key: "groupButtons.btnOps.menuItems.item1.onClick" },
                            { key: "groupButtons.btnOps.menuItems.item2.onClick" },
                            { key: "groupButtons.btnOps.menuItems.item3.onClick" },
                            { key: "groupButtons.btnOps.menuItems.item4.onClick" },
                            { key: "groupButtons.btnOps.menuItems.item5.onClick" }
                        ],
                        dynamicPropertyPathList: [],
                        dynamicBindingPathList: []
                    },
                    // Logout button
                    {
                        widgetName: "btnHeaderLogout",
                        type: "BUTTON_WIDGET",
                        topRow: 1,
                        bottomRow: 5,
                        leftColumn: 54,
                        rightColumn: 63,
                        text: "Logout",
                        buttonVariant: "SECONDARY",
                        buttonColor: "#ef4444",
                        onClick: "{{ storeValue('isAuthenticated', false); navigateTo('Login'); }}",
                        widgetId: logoutBtnId,
                        parentId: headerCanvasId,
                        renderMode: "CANVAS",
                        version: 1,
                        isVisible: true,
                        dynamicTriggerPathList: [{ key: "onClick" }],
                        dynamicPropertyPathList: [],
                        dynamicBindingPathList: []
                    }
                ]
            };

            // Create custom header container widget
            const headerContainer = {
                widgetName: "navHeader",
                type: "CONTAINER_WIDGET",
                boxShadow: "{{appsmith.store.theme.shadowSm}}",
                backgroundColor: "#ffffff",
                topRow: 0,
                bottomRow: 6,
                leftColumn: 0,
                rightColumn: 64,
                parentRowSpace: 10,
                parentColumnSpace: 19.9375,
                widgetId: headerContainerId,
                parentId: dsl.widgetId,
                renderMode: "CANVAS",
                version: 1,
                isVisible: "{{ appsmith.store.isAuthenticated }}",
                children: [headerCanvas],
                dynamicBindingPathList: [{ key: "isVisible" }],
                dynamicHeight: "AUTO_HEIGHT",
                maxDynamicHeight: 9000,
                minDynamicHeight: 4
            };

            // Prepend header to DSL children list
            if (!dsl.children) dsl.children = [];
            dsl.children.unshift(headerContainer);
        }

        // B. Prepend AuthCheck JS onload script to layoutOnLoadActions
        const authCollectionId = `${pageName}_AuthCheck`;
        const authActionId = `${pageName}_AuthCheck.checkAuth`;

        const authOnLoadActionRef = {
            id: authActionId,
            name: "AuthCheck.checkAuth",
            collectionId: authCollectionId,
            confirmBeforeExecute: false,
            pluginType: "JS",
            jsonPathKeys: [
                "() => {\n  if (!appsmith.store.isAuthenticated) {\n    navigateTo('Login');\n  }\n}"
            ],
            timeoutInMillisecond: 10000
        };

        if (!layout.layoutOnLoadActions) layout.layoutOnLoadActions = [];
        // Insert into the first execution level (Group 1)
        if (layout.layoutOnLoadActions.length === 0) {
            layout.layoutOnLoadActions.push([authOnLoadActionRef]);
        } else {
            layout.layoutOnLoadActions[0].unshift(authOnLoadActionRef);
        }
    });

    // C. Add AuthCheck Object to app JS actions collection list
    const authCollectionId = `${pageName}_AuthCheck`;
    const gitSyncId = generateId();

    const authCheckCollection = {
        unpublishedCollection: {
            name: "AuthCheck",
            pageId: pageName,
            pluginId: "js-plugin",
            pluginType: "JS",
            actions: [],
            archivedActions: [],
            body: "export default {\n\tcheckAuth: () => {\n\t\tif (!appsmith.store.isAuthenticated) {\n\t\t\tnavigateTo('Login');\n\t\t}\n\t}\n}",
            variables: [],
            userPermissions: []
        },
        publishedCollection: {
            name: "AuthCheck",
            pageId: pageName,
            pluginId: "js-plugin",
            pluginType: "JS",
            actions: [],
            archivedActions: [],
            body: "export default {\n\tcheckAuth: () => {\n\t\tif (!appsmith.store.isAuthenticated) {\n\t\t\tnavigateTo('Login');\n\t\t}\n\t}\n}",
            variables: [],
            userPermissions: []
        },
        gitSyncId: gitSyncId,
        id: authCollectionId,
        deleted: false
    };

    app.actionCollectionList.push(authCheckCollection);

    // D. Add AuthCheck.checkAuth function entry to app action list
    const authAction = {
        pluginType: "JS",
        pluginId: "js-plugin",
        unpublishedAction: {
            name: "checkAuth",
            fullyQualifiedName: "AuthCheck.checkAuth",
            datasource: {
                name: "UNUSED_DATASOURCE",
                pluginId: "js-plugin",
                messages: [],
                isAutoGenerated: false,
                deleted: false
            },
            pageId: pageName,
            collectionId: authCollectionId,
            actionConfiguration: {
                timeoutInMillisecond: 10000,
                paginationType: "NONE",
                encodeParamsToggle: true,
                body: "() => {\n  if (!appsmith.store.isAuthenticated) {\n    navigateTo('Login');\n  }\n}",
                selfReferencingDataPaths: [],
                jsArguments: []
            },
            runBehaviour: "ON_PAGE_LOAD",
            userSetOnLoad: true,
            confirmBeforeExecute: false,
            policyMap: {},
            userPermissions: []
        },
        publishedAction: {
            name: "checkAuth",
            fullyQualifiedName: "AuthCheck.checkAuth",
            datasource: {
                name: "UNUSED_DATASOURCE",
                pluginId: "js-plugin",
                messages: [],
                isAutoGenerated: false,
                deleted: false
            },
            pageId: pageName,
            collectionId: authCollectionId,
            actionConfiguration: {
                timeoutInMillisecond: 10000,
                paginationType: "NONE",
                encodeParamsToggle: true,
                body: "() => {\n  if (!appsmith.store.isAuthenticated) {\n    navigateTo('Login');\n  }\n}",
                selfReferencingDataPaths: [],
                jsArguments: []
            },
            runBehaviour: "ON_PAGE_LOAD",
            userSetOnLoad: true,
            confirmBeforeExecute: false,
            policyMap: {},
            userPermissions: []
        },
        gitSyncId: gitSyncId,
        id: `${pageName}_AuthCheck.checkAuth`,
        deleted: false
    };

    app.actionList.push(authAction);
});

// 3. Construct the new "Login" Page
const loginPageId = "Login";
const loginCanvasId = generateId();
const loginBoxId = generateId();
const loginBoxCanvasId = generateId();
const loginTitleId = generateId();
const userInpId = generateId();
const passInpId = generateId();
const loginBtnId = generateId();

const loginLayoutDSL = {
    widgetName: "MainContainer",
    backgroundColor: "#f8fafc",
    snapColumns: 64,
    detachFromLayout: true,
    widgetId: "0",
    topRow: 0,
    bottomRow: 80,
    containerStyle: "none",
    snapRows: 125,
    parentRowSpace: 1,
    type: "CANVAS_WIDGET",
    canExtend: true,
    version: 79,
    minHeight: 800,
    parentColumnSpace: 1,
    leftColumn: 0,
    rightColumn: 64,
    children: [
        // Center-aligned login container
        {
            widgetName: "conLoginBox",
            type: "CONTAINER_WIDGET",
            boxShadow: "{{appsmith.store.theme.shadowMd}}",
            backgroundColor: "#ffffff",
            topRow: 15,
            bottomRow: 50,
            leftColumn: 20,
            rightColumn: 44,
            parentRowSpace: 10,
            parentColumnSpace: 19.9375,
            widgetId: loginBoxId,
            parentId: "0",
            renderMode: "CANVAS",
            version: 1,
            isVisible: true,
            borderRadius: "{{appsmith.store.theme.radiusMd}}",
            children: [
                {
                    widgetName: `Canvas_${loginBoxId}`,
                    topRow: 0,
                    bottomRow: 35,
                    parentRowSpace: 1,
                    type: "CANVAS_WIDGET",
                    canExtend: false,
                    shouldScrollContents: false,
                    minHeight: 350,
                    parentColumnSpace: 1,
                    leftColumn: 0,
                    rightColumn: 24,
                    detachFromLayout: true,
                    widgetId: loginBoxCanvasId,
                    parentId: loginBoxId,
                    renderMode: "CANVAS",
                    version: 1,
                    children: [
                        // Title header
                        {
                            widgetName: "txtLoginTitle",
                            type: "TEXT_WIDGET",
                            topRow: 3,
                            bottomRow: 7,
                            leftColumn: 2,
                            rightColumn: 22,
                            text: "GNIDERTON ERP",
                            fontSize: "1.75rem",
                            fontStyle: "BOLD",
                            textColor: "#3b82f6",
                            alignment: "CENTER",
                            widgetId: loginTitleId,
                            parentId: loginBoxCanvasId,
                            renderMode: "CANVAS",
                            version: 1,
                            isVisible: true
                        },
                        // Username input
                        {
                            widgetName: "inpUsername",
                            type: "INPUT_WIDGET_V2",
                            topRow: 9,
                            bottomRow: 14,
                            leftColumn: 2,
                            rightColumn: 22,
                            labelText: "Username",
                            placeholderText: "Enter your username",
                            inputType: "TEXT",
                            widgetId: userInpId,
                            parentId: loginBoxCanvasId,
                            renderMode: "CANVAS",
                            version: 2,
                            isVisible: true,
                            isRequired: true,
                            dynamicBindingPathList: [],
                            dynamicTriggerPathList: []
                        },
                        // Password input
                        {
                            widgetName: "inpPassword",
                            type: "INPUT_WIDGET_V2",
                            topRow: 16,
                            bottomRow: 21,
                            leftColumn: 2,
                            rightColumn: 22,
                            labelText: "Password",
                            placeholderText: "Enter your password",
                            inputType: "PASSWORD",
                            widgetId: passInpId,
                            parentId: loginBoxCanvasId,
                            renderMode: "CANVAS",
                            version: 2,
                            isVisible: true,
                            isRequired: true,
                            dynamicBindingPathList: [],
                            dynamicTriggerPathList: []
                        },
                        // Submit login button
                        {
                            widgetName: "btnLoginSubmit",
                            type: "BUTTON_WIDGET",
                            topRow: 24,
                            bottomRow: 28,
                            leftColumn: 2,
                            rightColumn: 22,
                            text: "Sign In",
                            buttonColor: "#3b82f6",
                            onClick: "{{ (() => { if (inpUsername.text === 'admin' && inpPassword.text === 'admin123') { storeValue('isAuthenticated', true); storeValue('currentUser', inpUsername.text); navigateTo('Inventory'); } else { showAlert('Invalid credentials. Hint: admin / admin123', 'error'); } })() }}",
                            widgetId: loginBtnId,
                            parentId: loginBoxCanvasId,
                            renderMode: "CANVAS",
                            version: 1,
                            isVisible: true,
                            dynamicTriggerPathList: [{ key: "onClick" }],
                            dynamicPropertyPathList: [],
                            dynamicBindingPathList: []
                        }
                    ]
                }
            ]
        }
    ]
};

const loginPage = {
    unpublishedPage: {
        name: loginPageId,
        slug: "login",
        layouts: [
            {
                viewMode: false,
                dsl: loginLayoutDSL,
                layoutOnLoadActions: [],
                id: `${loginPageId}_layout`,
                deleted: false
            }
        ],
        userPermissions: []
    },
    publishedPage: {
        name: loginPageId,
        slug: "login",
        layouts: [
            {
                viewMode: false,
                dsl: loginLayoutDSL,
                layoutOnLoadActions: [],
                id: `${loginPageId}_layout`,
                deleted: false
            }
        ],
        userPermissions: []
    },
    gitSyncId: generateId(),
    deleted: false
};

// Insert new login page as the default first page
app.pageList.unshift(loginPage);

// 4. Update default page flags in application metadata
app.exportedApplication.pages.forEach(p => {
    p.isDefault = false;
});
app.exportedApplication.pages.unshift({
    id: loginPageId,
    isDefault: true
});

app.exportedApplication.publishedPages.forEach(p => {
    p.isDefault = false;
});
app.exportedApplication.publishedPages.unshift({
    id: loginPageId,
    isDefault: true
});

// Save modified JSON
fs.writeFileSync(filePath, JSON.stringify(app, null, 2), 'utf8');
console.log('Successfully completed modifying GNIDERTON ERP.json!');
