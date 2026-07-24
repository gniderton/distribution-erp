const fs = require('fs');

const data = JSON.parse(fs.readFileSync('GNIDERTON ERP.json', 'utf8'));

// find the page in pageList
let chequePageObj = null;
if (data.pageList) {
    chequePageObj = data.pageList.find(p => p.unpublishedPage?.name?.toLowerCase().includes('cheque') || p.publishedPage?.name?.toLowerCase().includes('cheque'));
}

if (chequePageObj) {
    fs.writeFileSync('cheque_page.json', JSON.stringify(chequePageObj, null, 2));
    console.log("Wrote cheque page: ", chequePageObj.unpublishedPage?.name || chequePageObj.publishedPage?.name);
    
    // Also extract actions related to this page
    const pageId = chequePageObj.id || chequePageObj.unpublishedPage?.id;
    if (pageId && data.actionList) {
        const actions = data.actionList.filter(a => a.unpublishedAction?.pageId === pageId || a.publishedAction?.pageId === pageId);
        fs.writeFileSync('cheque_actions.json', JSON.stringify(actions, null, 2));
        console.log("Wrote actions for cheque page: ", actions.length);
    }
} else {
    console.log("Cheque page not found in pageList");
}
