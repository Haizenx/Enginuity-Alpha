const fs = require('fs');
const file = 'frontend/chat-front-end/src/pages/QuotationPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Require the inputs on the create quotations
// Require address for supplier
content = content.replace(
  /placeholder="Physical Address \(Optional\)"/g,
  'placeholder="Physical Address (Required)" required'
);

// We should also make sure handleAddSupplier checks address
content = content.replace(
  /if \(!newSupplier\.name\.trim\(\)\) return toast\.error\("Supplier name is required"\);/,
  'if (!newSupplier.name.trim()) return toast.error("Supplier name is required");\n    if (!newSupplier.address.trim()) return toast.error("Supplier address is required");'
);

fs.writeFileSync(file, content);
console.log('Supplier address required');
