const fs = require('fs');
let c = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
c = c.replace('import React\\nimport { useTheme } from \'../theme\';', 'import React, { useState } from \'react\';\nimport { useTheme } from \'../theme\';');
c = c.replace('import React\\nimport { useTheme } from \\\'../theme\\\';', 'import React, { useState } from \'react\';\nimport { useTheme } from \'../theme\';');
fs.writeFileSync('src/screens/HomeScreen.tsx', c);
