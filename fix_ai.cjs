const fs = require('fs');
const file = 'frontend/chat-front-end/src/pages/BlueprintPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// The "Explore Further" section is inside a div.
// It has `<h3>Explore Further</h3>`.
// I will use regex to remove the block.
content = content.replace(/<div className="bg-slate-50\/50 p-6 sm:p-8 rounded-2xl border border-slate-100">[\s\S]*?<h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-6">[\s\S]*?Explore Further[\s\S]*?<\/div>/, '');

fs.writeFileSync(file, content);
console.log('AI explore further removed');
