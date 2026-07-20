const fs = require('fs');
const path = require('path');

const f2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'GNIDERTON ERP.json'), 'utf8'));

(f2.pageList || []).forEach(p => {
  const unpub = p.unpublishedPage || {};
  const pageName = unpub.name;
  
  let navHeaderWidget = null;
  let txtHeaderTitleWidget = null;
  
  const findWidgets = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') {
      navHeaderWidget = dsl;
    }
    if (dsl.widgetName === 'txtHeaderTitle') {
      txtHeaderTitleWidget = dsl;
    }
    if (dsl.children) {
      dsl.children.forEach(findWidgets);
    }
  };
  
  if (unpub.layouts && unpub.layouts[0] && unpub.layouts[0].dsl) {
    findWidgets(unpub.layouts[0].dsl);
  }
  
  if (navHeaderWidget || txtHeaderTitleWidget) {
    console.log(`Page: ${pageName}`);
    if (navHeaderWidget) {
      console.log(`  navHeader position: topRow=${navHeaderWidget.topRow}, bottomRow=${navHeaderWidget.bottomRow}, leftColumn=${navHeaderWidget.leftColumn}, rightColumn=${navHeaderWidget.rightColumn}`);
      console.log(`  navHeader border/padding/background details:`, {
        backgroundColor: navHeaderWidget.backgroundColor,
        boxShadow: navHeaderWidget.boxShadow,
        borderRadius: navHeaderWidget.borderRadius,
      });
    }
    if (txtHeaderTitleWidget) {
      console.log(`  txtHeaderTitle text property: "${txtHeaderTitleWidget.text}"`);
    }
  }
});
