const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const darkStyles = `
  /* Dark Mode Overrides */
  html.dark {
    --color-surface: #0f172a;
    --color-surface-raised: #1e293b;
    --color-border-subtle: #334155;
    
    /* Invert Ink (Text) Colors */
    --color-ink-950: #f8fafc;
    --color-ink-900: #f1f5f9;
    --color-ink-800: #e2e8f0;
    --color-ink-700: #cbd5e1;
    --color-ink-600: #94a3b8;
    
    /* Adjust accents for better dark mode visibility if needed */
  }
`;

if (!css.includes('html.dark')) {
  css = css.replace('}', '}' + darkStyles);
  fs.writeFileSync('src/index.css', css);
}
