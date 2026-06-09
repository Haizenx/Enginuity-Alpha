const fs = require('fs');
const file = 'frontend/chat-front-end/src/pages/SuperAdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Fix contact number regex for Client Form
content = content.replace(
  'onChange={(e) => setClientForm({ ...clientForm, contactNumber: e.target.value })}',
  'onChange={(e) => setClientForm({ ...clientForm, contactNumber: e.target.value.replace(/[^0-9+\\-() ]/g, "") })}'
);

// Fix contact number regex for Project Manager Form
content = content.replace(
  'onChange={(e) => setProjectManagerForm({ ...projectManagerForm, contactNumber: e.target.value })}',
  'onChange={(e) => setProjectManagerForm({ ...projectManagerForm, contactNumber: e.target.value.replace(/[^0-9+\\-() ]/g, "") })}'
);

// Fix contact number regex for Project Form
content = content.replace(
  'onChange={handleProjectFieldChange}',
  'onChange={(e) => { if (e.target.name === "contactNumber") e.target.value = e.target.value.replace(/[^0-9+\\-() ]/g, ""); handleProjectFieldChange(e); }}'
);

// Change Project Form initial state to set startDate to today
content = content.replace(
  'startDate: "",',
  'startDate: new Date().toISOString().split("T")[0],'
);

// Add 14-day validation to handleProjectSubmit
const validateDateLogic = `
    const start = new Date(startDate);
    const end = new Date(targetDeadline);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 14) {
      return toast.error("Project target deadline must be at least 14 days after the start date.");
    }
`;

content = content.replace(
  'if (!clientId || !projectManagerId || !description || !location || !contactNumber || !startDate || !targetDeadline) {',
  `${validateDateLogic}\n    if (!clientId || !projectManagerId || !description || !location || !contactNumber || !startDate || !targetDeadline) {`
);

fs.writeFileSync(file, content);
console.log('SuperAdminDashboard updated');
