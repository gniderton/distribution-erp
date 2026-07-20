const fs = require('fs');
const path = require('path');

const file1Path = path.join(__dirname, '..', 'GNIDERTON ERP Original.json');
const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');

console.log("Reading GNIDERTON ERP Original.json...");
const f1 = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
console.log("Reading GNIDERTON ERP.json...");
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

// Helper to find a widget by name in DSL recursively
const findWidgetByName = (dsl, name) => {
  if (!dsl) return null;
  if (dsl.widgetName === name) return dsl;
  if (dsl.children) {
    for (const child of dsl.children) {
      const found = findWidgetByName(child, name);
      if (found) return found;
    }
  }
  return null;
};

// Helper to update navbar in DSL
const updateNavbarInDSL = (w) => {
  if (!w) return;
  if (w.widgetName === 'btnGroupPageNav' && w.groupButtons) {
    const btnOps = w.groupButtons.btnOps;
    if (btnOps && btnOps.menuItems) {
      btnOps.menuItems.item6 = {
        id: "item6",
        index: 5,
        label: "Letterhead Editor",
        isVisible: true,
        isDisabled: false,
        onClick: "{{ navigateTo('Letterhead Editor') }}"
      };
    }
  }
  if (w.children) {
    w.children.forEach(updateNavbarInDSL);
  }
};

// Helper to update header title in DSL
const updateHeaderTitleInDSL = (w, pageName) => {
  if (!w) return;
  if (w.widgetName === 'txtHeaderTitle') {
    w.text = `GNIDERTON ERP - ${pageName}`;
  }
  if (w.children) {
    w.children.forEach(c => updateHeaderTitleInDSL(c, pageName));
  }
};

// Helper to update navHeader properties (e.g. bottomRow = 6, topRow = 0)
const updateNavHeaderHeightInDSL = (w) => {
  if (!w) return;
  if (w.widgetName === 'navHeader') {
    w.topRow = 0;
    w.bottomRow = 6;
    if (w.originalTopRow !== undefined) w.originalTopRow = 0;
    if (w.originalBottomRow !== undefined) w.originalBottomRow = 6;
  }
  if (w.children) {
    w.children.forEach(updateNavHeaderHeightInDSL);
  }
};

const getPageName = (p) => p.unpublishedPage ? p.unpublishedPage.name : (p.publishedPage ? p.publishedPage.name : '');

const mergedPageList = [];

// 1. Process pages from Original (f1)
console.log("Processing pages from Original and merging navHeaders...");
f1.pageList.forEach(p => {
  const pageName = getPageName(p);
  const pClone = JSON.parse(JSON.stringify(p));
  
  // Find the page in Current (f2) to get its navHeader
  const currentPage = f2.pageList.find(cp => getPageName(cp) === pageName);
  
  // Find navHeader from Current (try unpublished, then published)
  let navHeader = null;
  if (currentPage) {
    if (currentPage.unpublishedPage && currentPage.unpublishedPage.layouts && currentPage.unpublishedPage.layouts[0]) {
      navHeader = findWidgetByName(currentPage.unpublishedPage.layouts[0].dsl, 'navHeader');
    }
    if (!navHeader && currentPage.publishedPage && currentPage.publishedPage.layouts && currentPage.publishedPage.layouts[0]) {
      navHeader = findWidgetByName(currentPage.publishedPage.layouts[0].dsl, 'navHeader');
    }
  }
  
  // Process unpublishedPage layout
  if (pClone.unpublishedPage && pClone.unpublishedPage.layouts && pClone.unpublishedPage.layouts[0]) {
    const dsl = pClone.unpublishedPage.layouts[0].dsl;
    
    // Remove any existing navHeader in the clone to avoid duplication
    if (dsl.children) {
      dsl.children = dsl.children.filter(c => c.widgetName !== 'navHeader');
    }
    
    // Inject navHeader at the very beginning of the children list (index 0)
    if (navHeader) {
      console.log(`Injecting navHeader into unpublished layout for page: ${pageName}`);
      const navHeaderClone = JSON.parse(JSON.stringify(navHeader));
      dsl.children.unshift(navHeaderClone);
    }
    
    // Apply configurations
    updateNavbarInDSL(dsl);
    updateHeaderTitleInDSL(dsl, pageName);
    updateNavHeaderHeightInDSL(dsl);
  }
  
  // Process publishedPage layout
  if (pClone.publishedPage && pClone.publishedPage.layouts && pClone.publishedPage.layouts[0]) {
    const dsl = pClone.publishedPage.layouts[0].dsl;
    
    // Remove existing
    if (dsl.children) {
      dsl.children = dsl.children.filter(c => c.widgetName !== 'navHeader');
    }
    
    // Inject navHeader at the very beginning of the children list (index 0)
    if (navHeader) {
      console.log(`Injecting navHeader into published layout for page: ${pageName}`);
      const navHeaderClone = JSON.parse(JSON.stringify(navHeader));
      dsl.children.unshift(navHeaderClone);
    }
    
    // Apply configurations
    updateNavbarInDSL(dsl);
    updateHeaderTitleInDSL(dsl, pageName);
    updateNavHeaderHeightInDSL(dsl);
  }
  
  mergedPageList.push(pClone);
});

// 2. Process extra pages from Current (f2) (Login, Letterhead Editor)
console.log("Processing extra pages from Current...");
f2.pageList.forEach(p => {
  const pageName = getPageName(p);
  const isOriginalPage = f1.pageList.some(op => getPageName(op) === pageName);
  if (!isOriginalPage) {
    console.log(`Adding extra page: ${pageName}`);
    const pClone = JSON.parse(JSON.stringify(p));
    
    if (pClone.unpublishedPage && pClone.unpublishedPage.layouts && pClone.unpublishedPage.layouts[0]) {
      const dsl = pClone.unpublishedPage.layouts[0].dsl;
      
      // Move navHeader to the beginning of the children array if present
      if (dsl.children) {
        const navIndex = dsl.children.findIndex(c => c.widgetName === 'navHeader');
        if (navIndex > 0) {
          const [nav] = dsl.children.splice(navIndex, 1);
          dsl.children.unshift(nav);
        }
      }
      
      updateNavbarInDSL(dsl);
      updateHeaderTitleInDSL(dsl, pageName);
      updateNavHeaderHeightInDSL(dsl);
    }
    
    if (pClone.publishedPage && pClone.publishedPage.layouts && pClone.publishedPage.layouts[0]) {
      const dsl = pClone.publishedPage.layouts[0].dsl;
      
      // Move navHeader to the beginning of the children array if present
      if (dsl.children) {
        const navIndex = dsl.children.findIndex(c => c.widgetName === 'navHeader');
        if (navIndex > 0) {
          const [nav] = dsl.children.splice(navIndex, 1);
          dsl.children.unshift(nav);
        }
      }
      
      updateNavbarInDSL(dsl);
      updateHeaderTitleInDSL(dsl, pageName);
      updateNavHeaderHeightInDSL(dsl);
    }
    
    mergedPageList.push(pClone);
  }
});

// 3. Merging actionList (queries)
console.log("Merging actions...");
const mergedActionList = [];
const actionKeysAdded = new Set();

// Add all from Original (f1)
f1.actionList.forEach(a => {
  const actionKey = `${a.unpublishedAction.pageId}_${a.unpublishedAction.name}`;
  mergedActionList.push(a);
  actionKeysAdded.add(actionKey);
});

// Add from Current (f2) if they are on extra pages
f2.actionList.forEach(a => {
  const pageId = a.unpublishedAction.pageId;
  const isExtraPage = !f1.pageList.some(op => getPageName(op) === pageId);
  if (isExtraPage) {
    const actionKey = `${a.unpublishedAction.pageId}_${a.unpublishedAction.name}`;
    if (!actionKeysAdded.has(actionKey)) {
      mergedActionList.push(a);
      actionKeysAdded.add(actionKey);
    }
  }
});

// 4. Merging actionCollectionList (JS Objects)
console.log("Merging action collections...");
const mergedCollectionList = [];
const collKeysAdded = new Set();

// Add all from Original (f1)
f1.actionCollectionList.forEach(c => {
  const collKey = `${c.unpublishedCollection.pageId}_${c.unpublishedCollection.name}`;
  mergedCollectionList.push(c);
  collKeysAdded.add(collKey);
});

// Add from Current (f2) if they are on extra pages
f2.actionCollectionList.forEach(c => {
  const pageId = c.unpublishedCollection.pageId;
  const isExtraPage = !f1.pageList.some(op => getPageName(op) === pageId);
  if (isExtraPage) {
    const collKey = `${c.unpublishedCollection.pageId}_${c.unpublishedCollection.name}`;
    if (!collKeysAdded.has(collKey)) {
      mergedCollectionList.push(c);
      collKeysAdded.add(collKey);
    }
  }
});

// 5. Build final JSON structure
console.log("Constructing final JSON...");
const finalData = {
  ...f2,
  pageList: mergedPageList,
  actionList: mergedActionList,
  actionCollectionList: mergedCollectionList,
  exportedApplication: {
    ...f2.exportedApplication,
    pages: mergedPageList.map(p => {
      const name = getPageName(p);
      return {
        id: name,
        isDefault: name === 'Login'
      };
    })
  }
};

fs.writeFileSync(file2Path, JSON.stringify(finalData, null, 2), 'utf8');
console.log("Merge completed and saved to GNIDERTON ERP.json!");
