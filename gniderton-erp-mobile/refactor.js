const fs = require('fs');
let c = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
c = c.replace(/import React(.*?)\n/, "import React\\nimport { useTheme } from '../theme';\n");
c = c.replace(/export default function HomeScreen\(.*?\) \{/, "$&\n  const theme = useTheme();\n  const styles = getStyles(theme);\n");
c = c.replace(/const styles = StyleSheet\.create/, 'const getStyles = (theme: any) => StyleSheet.create');
const colors = {
  "'#f9fafb'": 'theme.background',
  "'#fff'": 'theme.card',
  "'#ffffff'": 'theme.card',
  "'#111827'": 'theme.text',
  "'#6b7280'": 'theme.textSecondary',
  "'#4b5563'": 'theme.textSecondary',
  "'#9ca3af'": 'theme.textMuted',
  "'#e5e7eb'": 'theme.border',
  "'#f3f4f6'": 'theme.input',
  "'#2f7f74'": 'theme.primary',
  "'#eff6ff'": 'theme.input',
  "'#16a34a'": 'theme.success',
  "'#ef4444'": 'theme.error',
  "'#dc2626'": 'theme.error'
};
for (const [hex, themeVar] of Object.entries(colors)) {
  c = c.split(hex).join(themeVar);
}
fs.writeFileSync('src/screens/HomeScreen.tsx', c);
