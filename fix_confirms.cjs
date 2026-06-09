const fs = require('fs');
const files = [
  'frontend/chat-front-end/src/components/ActivitiesCard.jsx',
  'frontend/chat-front-end/src/components/DocumentsCard.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Replace confirmToast definition with a simpler window.confirm wrapper
  const regex = /const confirmToast = \([\s\S]*?\}\);/m;
  const newConfirm = `const confirmToast = async (message) => {
    return window.confirm(message);
  };`;
  
  if (regex.test(content)) {
    content = content.replace(regex, newConfirm);
    fs.writeFileSync(file, content);
    console.log('Fixed confirm in', file);
  }
});
