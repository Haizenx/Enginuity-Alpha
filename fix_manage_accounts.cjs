const fs = require('fs');
const file = 'frontend/chat-front-end/src/pages/SuperAdminManageAccPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the password requests tab button
content = content.replace(/<button[\s\S]*?onClick=\{\(\) => setTab\("requests"\)\}[\s\S]*?<\/button>/, '');

// Remove the requests tab panel (this might be large, better to use a simple string replace for the start, but we can't easily regex match nested divs)
// Wait, we can just replace {tab === "requests" && ( ... )} with nothing. Let's find it.
// Or we can just use multi_replace_file_content.
// Actually, since it's hard to regex nested braces, let's use multi_replace_file_content!
