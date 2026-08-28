const fs = require('fs');
const files = [
  'src/modules/assets/components/AssetProfileDrawer.tsx',
  'src/modules/reports/components/PurchaseAnalyticsDashboard.tsx',
  'src/modules/reports/components/SalesAnalyticsDashboard.tsx',
  'src/modules/schemes/components/SchemeAnalyticsDashboard.tsx',
  'src/modules/reports/components/DseDashboardView.tsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/fill="#(0ea5e9|3b82f6|10b981|f43f5e|6366f1)"/g, (match, p1) => {
    if (p1 === '0ea5e9' || p1 === '3b82f6' || p1 === '6366f1') return 'fill="var(--color-brand-500)"';
    if (p1 === '10b981') return 'fill="var(--color-success-500)"';
    if (p1 === 'f43f5e') return 'fill="var(--color-danger-500)"';
    return match;
  });
  // also fix pie charts COLORS array
  content = content.replace(/const COLORS = \['#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'\]/g, 
    "const COLORS = ['var(--color-brand-500)', 'var(--color-brand-600)', 'var(--color-brand-700)', 'var(--color-brand-400)', 'var(--color-brand-300)']");
  fs.writeFileSync(f, content);
});
