const fs = require('fs');
const p = require('path').join(__dirname, '..', 'apps', 'web', 'src', 'pages', 'masters', 'PortTypesPage.tsx');
let c = fs.readFileSync(p, 'utf8');
c = c.split('  Ruler,').join('  Anchor,').split('<Ruler').join('<Anchor');
fs.writeFileSync(p, c, 'utf8');
console.log('fixed — first import lines:');
console.log(c.split(String.fromCharCode(10)).slice(0, 10).join('\n'));
