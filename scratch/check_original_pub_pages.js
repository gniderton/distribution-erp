const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

temp.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  console.log(`Page: ${name}, has unpublishedPage: ${!!p.unpublishedPage}, has publishedPage: ${!!p.publishedPage}`);
});
