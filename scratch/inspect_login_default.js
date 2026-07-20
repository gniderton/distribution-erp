const fs = require('fs');
const path = require('path');

const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

const loginPage = f2.pageList.find(p => p.unpublishedPage.name === 'Login');
console.log("Login Page unpublishedPage details:");
console.log("name:", loginPage.unpublishedPage.name);
console.log("isDefault:", loginPage.unpublishedPage.isDefault);
if (loginPage.publishedPage) {
  console.log("publishedPage.isDefault:", loginPage.publishedPage.isDefault);
}
