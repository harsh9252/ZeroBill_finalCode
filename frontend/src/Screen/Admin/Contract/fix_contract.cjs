const fs = require('fs');
const path = 'd:/Zero_Billss/Zerobill_book/Frontend/src/Screen/Admin/Contract/Contract.jsx';
let content = fs.readFileSync(path, 'utf8');

// This targets the specific corruption pattern seen: "w - full", "px - 3", etc.
content = content.replace(/ - /g, '-');
content = content.replace(/ : /g, ': ');

fs.writeFileSync(path, content, 'utf8');

